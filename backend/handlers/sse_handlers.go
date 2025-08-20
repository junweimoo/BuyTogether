package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
)

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

	flusher, ok := w.(http.Flusher)
	if ok {
		flusher.Flush()
	}

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

func (h *Handler) pushUpdatesToOtherClients(roomID string, userID string, info *SSEUpdateInfo) {
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
