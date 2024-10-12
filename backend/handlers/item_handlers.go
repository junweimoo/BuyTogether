package handlers

import (
	"backend/algorithm"
	"backend/models"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"gorm.io/gorm"
	"net/http"
	"sync"
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

func (h *Handler) ItemSSEHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	roomID := ps.ByName("roomID")

	if _, ok := h.RoomClients.Load(roomID); !ok {
		var chanUserMap sync.Map
		h.RoomClients.Store(roomID, &chanUserMap)
	}
	clients, _ := h.RoomClients.Load(roomID)
	clientMap := clients.(*sync.Map)

	messageChan := make(chan *SSEUpdateInfo)
	clientMap.Store(messageChan, r.Context().Value("userID").(uuid.UUID).String())

	defer func() {
		clientMap.Delete(messageChan)
		close(messageChan)
	}()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	for {
		select {
		case info := <-messageChan:
			serializedData, err := json.Marshal(info)
			if err != nil {
				http.Error(w, "ERR_JSON_SERIALIZE", http.StatusInternalServerError)
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", serializedData)
			flusher, ok := w.(http.Flusher)
			if ok {
				flusher.Flush()
			}
		case <-r.Context().Done():
			return
		}
	}
}

func (h *Handler) pushItemsToOtherClients(roomID string, userID string, info *SSEUpdateInfo) {
	clients, _ := h.RoomClients.Load(roomID)
	clientMap := clients.(*sync.Map)
	clientMap.Range(func(ch, value interface{}) bool {
		clientUID := value.(string)
		if clientUID != userID {
			updateChan := ch.(chan *SSEUpdateInfo)
			updateChan <- info
		}
		return true
	})
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
	h.pushItemsToOtherClients(ps.ByName("roomID"), userIDStr, info)

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
	h.pushItemsToOtherClients(ps.ByName("roomID"), userIDStr, info)

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
	h.pushItemsToOtherClients(ps.ByName("roomID"), userIDStr, info)

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
	h.pushItemsToOtherClients(ps.ByName("roomID"), userIDStr, info)

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
	h.pushItemsToOtherClients(ps.ByName("roomID"), userIDStr, info)

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
	if err := h.DB.Where("room_id = ?", roomID).Find(&items).Error; err != nil {
		return nil, err
	}

	simplifiedItems := h.Simplifier.SimplifyItems(items, algoType)

	// TODO: lock DB row while processing
	if err := h.DB.Where("room_id = ?", roomID).Delete(&models.SimplifiedItem{}).Error; err != nil {
		return nil, err
	}

	if len(simplifiedItems) != 0 {
		if err := h.DB.Create(&simplifiedItems).Error; err != nil {
			return nil, err
		}
	}

	return simplifiedItems, nil
}
