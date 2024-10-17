package handlers

import (
	"backend/models"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"golang.org/x/crypto/bcrypt"
	"net/http"
)

func (h *Handler) GetUsersInRoom(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")
	var users []models.User
	if err := h.DB.Table("room_users").
		Select("users.id, users.name").
		Joins("JOIN users ON users.id = room_users.user_id").
		Where("room_users.room_id = ? AND room_users.status != ?", roomID, "LEFT").
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
		Where("room_users.user_id = ? AND room_users.status != ?", userId, "LEFT").
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

	response := map[string]interface{}{
		"message": "User added to room",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	var user models.User

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if len(user.PasswordHash) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}
	if len(user.Name) < 6 {
		http.Error(w, "Name must be at least 6 characters", http.StatusBadRequest)
		return
	}

	var existingUser models.User
	if err := h.DB.Where("name = ?", user.Name).First(&existingUser).Error; err == nil {
		http.Error(w, "User already exists", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}
	user.PasswordHash = string(hashedPassword)

	if err := h.DB.Create(&user).Error; err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message": "USER_CREATED",
		"success": true,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) LoginUser(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var foundUser models.User
	if err := h.DB.First(&foundUser, "name = ?", user.Name).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(foundUser.PasswordHash), []byte(user.PasswordHash)); err != nil {
		http.Error(w, "Incorrect password", http.StatusUnauthorized)
		return
	}

	tokenString, err := h.Auth.GenerateToken(&foundUser)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message": "User logged in",
		"user":    foundUser,
		"token":   tokenString,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
