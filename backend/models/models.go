package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Room struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;" json:"id"`
	Name      string    `gorm:"type:text" json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Item struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;" json:"id"`
	RoomID          uuid.UUID `gorm:"type:uuid;index;" json:"room_id"`
	GroupID         uuid.UUID `gorm:"type:uuid;index;" json:"group_id"`
	FromUserID      uuid.UUID `gorm:"type:uuid;index;" json:"from_user_id"`
	ToUserID        uuid.UUID `gorm:"type:uuid;index;" json:"to_user_id"`
	Amount          int       `gorm:"type:int;" json:"amount"`
	Content         string    `json:"content"`
	TransactionType string    `json:"transaction_type"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;" json:"id"`
	Name         string    `gorm:"type:text;unique" json:"name"`
	PasswordHash string    `gorm:"type:text;" json:"password_hash"`
}

type RoomUser struct {
	RoomID uuid.UUID `gorm:"type:uuid;primary_key;" json:"room_id"`
	UserID uuid.UUID `gorm:"type:uuid;index;" json:"user_id"`
	Status string    `json:"status"`
}

type SimplifiedItem struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;" json:"id"`
	RoomID     uuid.UUID `gorm:"type:uuid;index;" json:"room_id"`
	FromUserID uuid.UUID `gorm:"type:uuid;index;" json:"from_user_id"`
	ToUserID   uuid.UUID `gorm:"type:uuid;index;" json:"to_user_id"`
	Amount     int       `gorm:"type:int;" json:"amount"`
}

func (r *Room) BeforeCreate(tx *gorm.DB) (err error) {
	r.ID = uuid.New()
	return
}

func (i *Item) BeforeCreate(tx *gorm.DB) (err error) {
	i.ID = uuid.New()
	return
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	u.ID = uuid.New()
	return
}

func (u *SimplifiedItem) BeforeCreate(tx *gorm.DB) (err error) {
	u.ID = uuid.New()
	return
}
