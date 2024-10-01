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

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	room := models.Room{}
	h.DB.Create(&room)
	json.NewEncoder(w).Encode(room)
}

func (h *Handler) GetRoom(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")
	var room models.Room
	if err := h.DB.First(&room, "id = ?", roomID).Error; err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}
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
	json.NewEncoder(w).Encode(item)
}

func (h *Handler) GetItems(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")
	var items []models.Item
	h.DB.Where("room_id = ?", roomID).Find(&items)
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
	//h.DB.Raw("SELECT u.id, u.name FROM users u JOIN room_users ru ON u.id = ru.user_id WHERE ru.room_id = ?", roomID).Scan(&users)
	if err := h.DB.Table("room_users").
		Select("users.id, users.name").
		Joins("JOIN users ON users.id = room_users.user_id").
		Where("room_users.room_id = ?", roomID).
		Scan(&users).Error; err != nil {
		http.Error(w, "Failed to retrieve users", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
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
	h.DB.Create(&user)
	json.NewEncoder(w).Encode(user)
}
