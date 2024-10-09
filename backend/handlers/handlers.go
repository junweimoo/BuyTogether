package handlers

import (
	"backend/algorithm"
	"backend/middleware"
	"gorm.io/gorm"
)

type Handler struct {
	DB         *gorm.DB
	Simplifier *algorithm.Simplifier
	Auth       *middleware.Auth
}
