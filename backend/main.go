package main

import (
	"backend/algorithm"
	"backend/middleware"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/joho/godotenv"
	"github.com/rs/cors"

	"github.com/julienschmidt/httprouter"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"backend/handlers"
	"backend/models"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file")
	}

	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbPort := os.Getenv("DB_PORT")
	dbHost := os.Getenv("DB_HOST")
	dbSSLMode := os.Getenv("DB_SSLMODE")
	jwtkey := os.Getenv("JWT_SECRET")

	dsn := fmt.Sprintf("user=%s password=%s dbname=%s port=%s host=%s sslmode=%s",
		dbUser, dbPassword, dbName, dbPort, dbHost, dbSSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	db.AutoMigrate(&models.Room{}, &models.Item{}, &models.User{}, &models.RoomUser{})

	simplifier := algorithm.Simplifier{}
	auth := middleware.Auth{JWTKey: []byte(jwtkey)}

	// roomID -> clientUID -> chan *SSEUpdateInfo
	var roomClients sync.Map

	// roomID -> []models.SimplifiedItem
	var roomToSimplifiedItems sync.Map

	h := handlers.Handler{
		DB:                    db,
		Simplifier:            &simplifier,
		Auth:                  &auth,
		RoomClients:           &roomClients,
		RoomToSimplifiedItems: &roomToSimplifiedItems,
	}

	router := httprouter.New()

	// Health check
	router.GET("/healthcheck", h.HealthCheck)

	// Rooms
	router.POST("/rooms", auth.JWTAuth(h.CreateRoom))
	router.GET("/rooms/:roomID", auth.JWTAuth(h.GetRoomInfo))
	router.POST("/rooms/:roomID", auth.JWTAuth(h.JoinRoom))
	router.POST("/rooms/:roomID/leave", auth.JWTAuth(h.LeaveRoom))
	router.GET("/rooms/:roomID/users", h.GetUsersInRoom)
	// TODO: Roles (Admin, User, ...), InviteUser, ApproveUser

	// Items
	router.GET("/rooms/:roomID/items", auth.JWTAuth(h.GetItems))
	router.DELETE("/rooms/:roomID/items/:itemID", auth.JWTAuth(h.DeleteItem))
	router.GET("/rooms/:roomID/simplified_items", auth.JWTAuth(h.GetSimplifiedItems))
	router.POST("/rooms/:roomID/simplify", auth.JWTAuth(h.SimplifyItems))
	// TODO: support FX
	router.POST("/rooms/:roomID/items", auth.JWTAuth(h.CreateTransfer))
	router.POST("/rooms/:roomID/items/groupExpense", auth.JWTAuth(h.CreateGroupExpense))
	router.POST("/rooms/:roomID/items/groupIncome", auth.JWTAuth(h.CreateGroupIncome))
	router.DELETE("/rooms/:roomID/groups/:groupID", auth.JWTAuth(h.DeleteGroupedItems))
	router.GET("/rooms/:roomID/sse", auth.JWTAuth(h.ItemSSEHandler))

	// Users
	router.POST("/users/register", h.CreateUser)
	router.POST("/users/login", h.LoginUser)
	router.GET("/users/:userID", auth.JWTAuth(h.GetUserInfo))

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://158.69.215.13:3000", "http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	corsHandler := c.Handler(router)

	log.Println("Server running on port 5001")
	log.Fatal(http.ListenAndServe(":5001", corsHandler))
}
