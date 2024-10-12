package handlers

import (
	"backend/algorithm"
	"backend/middleware"
	"backend/models"
	"gorm.io/gorm"
)

type Handler struct {
	DB          *gorm.DB
	Simplifier  *algorithm.Simplifier
	Auth        *middleware.Auth
	RoomClients map[string]map[chan *SSEUpdateInfo]string
}

type SSEUpdateInfo struct {
	NewItems        []models.Item           `json:"new_items"`
	DeletedItems    []models.Item           `json:"deleted_items"`
	SimplifiedItems []models.SimplifiedItem `json:"simplified_items"`
}
