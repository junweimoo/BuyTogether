package handlers

import (
	"encoding/json"
	"net/http"

	"backend/models"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"gorm.io/gorm"
)

type Handler struct {
	DB *gorm.DB
}

type CreateRoomRequest struct {
	RoomName string    `json:"roomName"`
	UserID   uuid.UUID `json:"userID"`
}

func (h *Handler) GetRoomInfo(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID, err := uuid.Parse(ps.ByName("roomID"))
	if err != nil {
		http.Error(w, "Invalid Room ID", http.StatusBadRequest)
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
	if err := h.DB.Where("room_id = ?", roomID).Find(&items).Error; err != nil {
		http.Error(w, "Failed to retrieve items", http.StatusInternalServerError)
	}

	response := map[string]interface{}{
		"room":  room,
		"items": items,
		"users": users,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var createRoomRequest CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&createRoomRequest); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	user := models.User{ID: createRoomRequest.UserID}
	room := models.Room{Name: createRoomRequest.RoomName}

	if err := h.DB.Create(&room).Error; err != nil {
		http.Error(w, "Error creating room", http.StatusInternalServerError)
		return
	}

	var roomUser = models.RoomUser{
		RoomID: room.ID,
		UserID: user.ID,
	}
	if err := h.DB.Where("room_id = ? AND user_id = ?", roomUser.RoomID, roomUser.UserID).First(&roomUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := h.DB.Create(&roomUser).Error; err != nil {
				http.Error(w, "Failed to add user to room", http.StatusInternalServerError)
				return
			}
		} else {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(room)
}

func (h *Handler) JoinRoom(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	roomID := ps.ByName("roomID")
	var room models.Room
	if err := h.DB.First(&room, "id = ?", roomID).Error; err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	var roomUser = models.RoomUser{
		RoomID: room.ID,
		UserID: user.ID,
	}
	if err := h.DB.Where("room_id = ? AND user_id = ?", roomUser.RoomID, roomUser.UserID).First(&roomUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := h.DB.Create(&roomUser).Error; err != nil {
				http.Error(w, "Failed to add user to room", http.StatusInternalServerError)
				return
			}
		} else {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(room)
}

func (h *Handler) CreateItem(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID, err := uuid.Parse(ps.ByName("roomID"))
	if err != nil {
		http.Error(w, "Invalid Room ID", http.StatusBadRequest)
		return
	}

	var item models.Item
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	item.RoomID = roomID
	h.DB.Create(&item)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (h *Handler) GetItems(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")
	var items []models.Item
	if err := h.DB.Where("room_id = ?", roomID).Find(&items).Error; err != nil {
		http.Error(w, "Failed to retrieve items", http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func (h *Handler) DeleteItem(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	itemID := ps.ByName("itemID")
	if err := h.DB.Delete(&models.Item{}, "id = ?", itemID).Error; err != nil {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetUsersInRoom(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")
	var users []models.User
	if err := h.DB.Table("room_users").
		Select("users.id, users.name").
		Joins("JOIN users ON users.id = room_users.user_id").
		Where("room_users.room_id = ?", roomID).
		Find(&users).Error; err != nil {
		http.Error(w, "Failed to retrieve users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *Handler) GetUserInfo(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	userId := ps.ByName("userID")

	var user models.User
	if err := h.DB.First(&user, "id = ?", userId).Error; err != nil {
		http.Error(w, "Failed to retrieve user", http.StatusInternalServerError)
		return
	}

	var rooms []models.Room
	if err := h.DB.Table("room_users").
		Select("rooms.id, rooms.name, rooms.created_at, rooms.updated_at").
		Joins("JOIN rooms ON rooms.id = room_users.room_id").
		Where("room_users.user_id = ?", userId).
		Find(&rooms).Error; err != nil {
		http.Error(w, "Failed to retrieve rooms belonging to user", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"user":  user,
		"rooms": rooms,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) AddUserToRoom(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	var roomUser models.RoomUser

	if err := json.NewDecoder(r.Body).Decode(&roomUser); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if roomUser.RoomID == uuid.Nil || roomUser.UserID == uuid.Nil {
		http.Error(w, "room_id and user_id are required", http.StatusBadRequest)
		return
	}

	var existingRoomUser models.RoomUser
	if err := h.DB.Where("room_id = ? AND user_id = ?", roomUser.RoomID, roomUser.UserID).First(&existingRoomUser).Error; err == nil {
		// If entry already exists, return a conflict status
		json.NewEncoder(w).Encode(map[string]string{"message": "User already in the room"})
		return
	}

	if err := h.DB.Create(&roomUser).Error; err != nil {
		http.Error(w, "Failed to add user to room", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "User successfully added to room"})
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	var user models.User

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var existingUser models.User
	if err := h.DB.Where("name = ?", user.Name).First(&existingUser).Error; err == nil {
		response := map[string]interface{}{
			"user":   existingUser,
			"is_new": false,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	if err := h.DB.Create(&user).Error; err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"user":   user,
		"is_new": true,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
