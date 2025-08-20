package handlers

import (
	"backend/algorithm"
	"backend/middleware"
	"backend/models"
	"sync"

	"gorm.io/gorm"
)

type Handler struct {
	DB                    *gorm.DB
	Simplifier            *algorithm.Simplifier
	Auth                  *middleware.Auth
	RoomClients           *sync.Map
	RoomToSimplifiedItems *sync.Map
}

type SSEUpdateInfo struct {
	NewItems        []models.Item           `json:"new_items"`
	DeletedItems    []models.Item           `json:"deleted_items"`
	SimplifiedItems []models.SimplifiedItem `json:"simplified_items"`
	NewUser         *models.User            `json:"new_user"`
}
