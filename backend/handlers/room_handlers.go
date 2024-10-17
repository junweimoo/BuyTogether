package handlers

import (
	"backend/models"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"gorm.io/gorm"
	"net/http"
)

type CreateRoomRequest struct {
	RoomName string `json:"roomName"`
}

func (h *Handler) GetRoomInfo(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID, err := uuid.Parse(ps.ByName("roomID"))
	if err != nil {
		http.Error(w, "Invalid Room ID", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("userID").(uuid.UUID)
	var roomUser models.RoomUser
	if err := h.DB.Where("user_id = ? AND room_id = ?", userID, roomID).First(&roomUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "User does not belong to this room", http.StatusNotFound)
		} else {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	var room models.Room
	if err := h.DB.First(&room, roomID).Error; err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
	}

	var users []models.User
	if err := h.DB.Table("room_users").
		Select("users.id, users.name").
		Joins("JOIN users ON users.id = room_users.user_id").
		Where("room_users.room_id = ?", roomID).
		Find(&users).Error; err != nil {
		http.Error(w, "Failed to retrieve users", http.StatusInternalServerError)
		return
	}

	var items []models.Item
	if err := h.DB.Where("room_id = ?", roomID).Order("created_at ASC").Find(&items).Error; err != nil {
		http.Error(w, "Failed to retrieve items", http.StatusInternalServerError)
		return
	}

	var simplifiedItems []models.SimplifiedItem
	if err := h.DB.Where("room_id = ?", roomID).Find(&simplifiedItems).Error; err != nil {
		http.Error(w, "Failed to retrieve simplified items", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"room":            room,
		"items":           items,
		"users":           users,
		"simplifiedItems": simplifiedItems,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var createRoomRequest CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&createRoomRequest); err != nil {
		http.Error(w, "INVALID_REQUEST", http.StatusBadRequest)
		return
	}

	if len(createRoomRequest.RoomName) < 5 || len(createRoomRequest.RoomName) > 20 {
		http.Error(w, "INVALID_NAME_LENGTH", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("userID").(uuid.UUID)
	user := models.User{ID: userID}
	room := models.Room{Name: createRoomRequest.RoomName}

	//if err := h.DB.Where("name = ?", createRoomRequest.RoomName).First(&room).Error; err == nil {
	//	http.Error(w, "Room with the same name already exists", http.StatusInternalServerError)
	//	return
	//}

	if err := h.DB.Create(&room).Error; err != nil {
		http.Error(w, "ERROR_DB_ROOMS", http.StatusInternalServerError)
		return
	}

	var roomUser = models.RoomUser{
		RoomID: room.ID,
		UserID: user.ID,
		Status: "IN",
	}
	if err := h.DB.Where("room_id = ? AND user_id = ?", roomUser.RoomID, roomUser.UserID).FirstOrCreate(&roomUser).Error; err != nil {
		http.Error(w, "ERROR_DB_ROOMUSERS", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(room)
}

func (h *Handler) JoinRoom(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")
	userIDFromJWT := r.Context().Value("userID").(uuid.UUID)

	var room models.Room
	if err := h.DB.First(&room, "id = ?", roomID).Error; err != nil {
		http.Error(w, "ROOM_NOT_FOUND", http.StatusNotFound)
		return
	}

	var user models.User
	if err := h.DB.Where("id = ?", userIDFromJWT).First(&user).Error; err != nil {
		http.Error(w, "USER_NOT_FOUND", http.StatusNotFound)
		return
	}

	var roomUser = models.RoomUser{
		RoomID: room.ID,
		UserID: userIDFromJWT,
		Status: "IN",
	}

	result := h.DB.Model(&models.RoomUser{}).
		Where("room_id = ? AND user_id = ?", roomUser.RoomID, roomUser.UserID).
		Update("status", "IN")

	if result.RowsAffected == 0 {
		if err := h.DB.Create(&roomUser).Error; err != nil {
			http.Error(w, "DB_ERROR_ROOMUSERS", http.StatusInternalServerError)
			return
		}
	} else if result.Error != nil {
		http.Error(w, "DB_ERROR_ROOMUSERS", http.StatusInternalServerError)
		return
	}

	h.pushUpdatesToOtherClients(roomID, userIDFromJWT.String(), &SSEUpdateInfo{
		NewUser: user,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(room)
}

func (h *Handler) LeaveRoom(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	userID := r.Context().Value("userID").(uuid.UUID)
	roomID := ps.ByName("roomID")

	if err := h.DB.First(&models.User{}, "id = ?", userID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var room models.Room
	if err := h.DB.First(&room, "id = ?", roomID).Error; err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	if err := h.DB.Model(&models.RoomUser{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Update("status", "LEFT").Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "User does not belong to this room", http.StatusNotFound)
		} else {
			http.Error(w, "DB_ERROR_ROOMUSERS", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User successfully left the room"})
}
