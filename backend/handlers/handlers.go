package handlers

import (
	"backend/algorithm"
	"backend/middleware"
	"backend/models"
	"gorm.io/gorm"
	"sync"
)

type Handler struct {
	DB          *gorm.DB
	Simplifier  *algorithm.Simplifier
	Auth        *middleware.Auth
	RoomClients *sync.Map
}

type SSEUpdateInfo struct {
	NewItems        []models.Item           `json:"new_items"`
	DeletedItems    []models.Item           `json:"deleted_items"`
	SimplifiedItems []models.SimplifiedItem `json:"simplified_items"`
}
