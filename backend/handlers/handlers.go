package handlers

import (
	"backend/algorithm"
	"gorm.io/gorm"
)

type Handler struct {
	DB         *gorm.DB
	Simplifier *algorithm.Simplifier
}
