package handlers

import (
	"backend/algorithm"
	"backend/models"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"gorm.io/gorm"
	"net/http"
)

const (
	Expense  string = "EXPENSE"
	Income   string = "INCOME"
	Transfer string = "TRANSFER"
)

const (
	DefaultAlgo = algorithm.Greedy
)

type CreateGroupExpenseRequest struct {
	Items []models.Item `json:"items"`
}

type CreateGroupIncomeRequest struct {
	Items []models.Item `json:"items"`
}

func (h *Handler) GetItems(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")
	var items []models.Item
	if err := h.DB.Where("room_id = ?", roomID).Order("created_at ASC").Find(&items).Error; err != nil {
		http.Error(w, "DB_ERROR_ROOM_ITEMS", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func (h *Handler) DeleteItem(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	itemID := ps.ByName("itemID")

	var deletedItem models.Item
	if err := h.DB.Where("id = ?", itemID).First(&deletedItem).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "ITEM_NOT_FOUND", http.StatusNotFound)
		} else {
			http.Error(w, "DB_ERROR_ITEMS", http.StatusInternalServerError)
		}
		return
	}

	if err := h.DB.Delete(&models.Item{}, "id = ?", itemID).Error; err != nil {
		http.Error(w, "DB_ERROR_ITEMS", http.StatusNotFound)
		return
	}

	roomID, _ := uuid.Parse(ps.ByName("roomID"))
	simplifiedItems, _ := h.simplifyAndStore(roomID, DefaultAlgo)

	userIDStr := r.Context().Value("userID").(uuid.UUID).String()
	info := &SSEUpdateInfo{
		DeletedItems:    []models.Item{deletedItem},
		SimplifiedItems: simplifiedItems,
	}
	h.pushUpdatesToOtherClients(ps.ByName("roomID"), userIDStr, info)

	response := map[string]interface{}{
		"simplifiedItems": simplifiedItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) DeleteGroupedItems(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	groupID := ps.ByName("groupID")

	var deletedItems []models.Item
	if err := h.DB.Where("group_id = ?", groupID).Find(&deletedItems).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "GROUPID_NOT_FOUND", http.StatusNotFound)
		} else {
			http.Error(w, "DB_ERROR_ITEMS", http.StatusInternalServerError)
		}
		return
	}

	if err := h.DB.Delete(&models.Item{}, "group_id = ?", groupID).Error; err != nil {
		http.Error(w, "DB_ERROR_ITEMS", http.StatusInternalServerError)
		return
	}

	roomID, _ := uuid.Parse(ps.ByName("roomID"))
	simplifiedItems, _ := h.simplifyAndStore(roomID, DefaultAlgo)

	userIDStr := r.Context().Value("userID").(uuid.UUID).String()
	info := &SSEUpdateInfo{
		DeletedItems:    deletedItems,
		SimplifiedItems: simplifiedItems,
	}
	h.pushUpdatesToOtherClients(ps.ByName("roomID"), userIDStr, info)

	response := map[string]interface{}{
		"simplifiedItems": simplifiedItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateTransfer(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID, err := uuid.Parse(ps.ByName("roomID"))
	if err != nil {
		http.Error(w, "INVALID_ROOM_ID", http.StatusBadRequest)
		return
	}

	var item models.Item
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "INVALID_INPUT", http.StatusBadRequest)
		return
	}

	item.GroupID = uuid.New()
	item.RoomID = roomID
	item.TransactionType = Transfer

	if err := h.DB.Create(&item).Error; err != nil {
		http.Error(w, "DB_ERROR_ITEMS", http.StatusInternalServerError)
	}

	simplifiedItems, _ := h.simplifyAndStore(roomID, DefaultAlgo)

	userIDStr := r.Context().Value("userID").(uuid.UUID).String()
	info := &SSEUpdateInfo{
		NewItems:        []models.Item{item},
		SimplifiedItems: simplifiedItems,
	}
	h.pushUpdatesToOtherClients(ps.ByName("roomID"), userIDStr, info)

	response := map[string]interface{}{
		"newItem":         item,
		"simplifiedItems": simplifiedItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateGroupExpense(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID, err := uuid.Parse(ps.ByName("roomID"))
	if err != nil {
		http.Error(w, "INVALID_ROOM_ID", http.StatusBadRequest)
		return
	}

	var req CreateGroupExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "INVALID_INPUT", http.StatusBadRequest)
		return
	}

	groupID := uuid.New()

	for i := range req.Items {
		req.Items[i].RoomID = roomID
		req.Items[i].GroupID = groupID
		req.Items[i].TransactionType = Expense
	}

	if err := h.DB.Create(&req.Items).Error; err != nil {
		http.Error(w, "DB_ERROR_ITEMS", http.StatusInternalServerError)
	}

	simplifiedItems, _ := h.simplifyAndStore(roomID, DefaultAlgo)

	userIDStr := r.Context().Value("userID").(uuid.UUID).String()
	info := &SSEUpdateInfo{
		NewItems:        req.Items,
		SimplifiedItems: simplifiedItems,
	}
	h.pushUpdatesToOtherClients(ps.ByName("roomID"), userIDStr, info)

	response := map[string]interface{}{
		"newItems":        req.Items,
		"simplifiedItems": simplifiedItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) CreateGroupIncome(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID, err := uuid.Parse(ps.ByName("roomID"))
	if err != nil {
		http.Error(w, "INVALID_ROOM_ID", http.StatusBadRequest)
		return
	}

	var req CreateGroupIncomeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "INVALID_INPUT", http.StatusBadRequest)
		return
	}

	groupID := uuid.New()

	for i := range req.Items {
		req.Items[i].RoomID = roomID
		req.Items[i].GroupID = groupID
		req.Items[i].TransactionType = Income
	}

	if err := h.DB.Create(&req.Items).Error; err != nil {
		http.Error(w, "DB_ERROR_ITEMS", http.StatusInternalServerError)
	}

	simplifiedItems, _ := h.simplifyAndStore(roomID, DefaultAlgo)

	userIDStr := r.Context().Value("userID").(uuid.UUID).String()
	info := &SSEUpdateInfo{
		NewItems:        req.Items,
		SimplifiedItems: simplifiedItems,
	}
	h.pushUpdatesToOtherClients(ps.ByName("roomID"), userIDStr, info)

	response := map[string]interface{}{
		"newItems":        req.Items,
		"simplifiedItems": simplifiedItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetSimplifiedItems(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")

	var simplifiedItems []models.SimplifiedItem
	if err := h.DB.Where("room_id = ?", roomID).Find(&simplifiedItems).Error; err != nil {
		http.Error(w, "DB_ERROR_SIMPLIFIED_ITEMS", http.StatusInternalServerError)
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

	tx := h.DB.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Raw("SELECT * FROM items WHERE room_id = ? FOR UPDATE", roomID).Scan(&items).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	simplifiedItems := h.Simplifier.SimplifyItems(items, algoType)

	if err := tx.Where("room_id = ?", roomID).Delete(&models.SimplifiedItem{}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if len(simplifiedItems) != 0 {
		if err := tx.Create(&simplifiedItems).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return simplifiedItems, nil
}
