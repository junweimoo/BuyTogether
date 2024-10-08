package handlers

import (
	"backend/algorithm"
	"backend/models"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"net/http"
)

const (
	DefaultAlgo = algorithm.Greedy
)

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

	roomID, _ := uuid.Parse(ps.ByName("roomID"))
	simplifiedItems, _ := h.simplifyAndStore(roomID, DefaultAlgo)

	response := map[string]interface{}{
		"simplifiedItems": simplifiedItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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

	simplifiedItems, _ := h.simplifyAndStore(roomID, DefaultAlgo)

	response := map[string]interface{}{
		"newItem":         item,
		"simplifiedItems": simplifiedItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetSimplifiedItems(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")

	var simplifiedItems []models.SimplifiedItem
	if err := h.DB.Where("room_id = ?", roomID).Find(&simplifiedItems).Error; err != nil {
		http.Error(w, "Failed to retrieve simplified items", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(simplifiedItems)
}

func (h *Handler) SimplifyItems(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID, err := uuid.Parse(ps.ByName("roomID"))
	if err != nil {
		http.Error(w, "Invalid Room ID", http.StatusBadRequest)
		return
	}

	algoStr := r.URL.Query().Get("algo")
	algo := h.Simplifier.GetAlgorithmType(algoStr)

	simplifiedItems, _ := h.simplifyAndStore(roomID, algo)

	response := map[string]interface{}{
		"algo":            algoStr,
		"simplifiedItems": simplifiedItems,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) simplifyAndStore(roomID uuid.UUID, algoType algorithm.AlgoType) ([]models.SimplifiedItem, error) {
	var items []models.Item
	if err := h.DB.Where("room_id = ?", roomID).Find(&items).Error; err != nil {
		return nil, err
	}

	if len(items) == 0 {
		return []models.SimplifiedItem{}, nil
	}

	simplifiedItems := h.Simplifier.SimplifyItems(items, algoType)

	if len(simplifiedItems) == 0 {
		return []models.SimplifiedItem{}, nil
	}

	// TODO: lock DB row while processing
	if err := h.DB.Where("room_id = ?", roomID).Delete(&models.SimplifiedItem{}).Error; err != nil {
		return nil, err
	}
	if err := h.DB.Create(&simplifiedItems).Error; err != nil {
		return nil, err
	}

	return simplifiedItems, nil
}
