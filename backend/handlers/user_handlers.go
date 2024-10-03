package handlers

import (
	"backend/models"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"net/http"
)

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
