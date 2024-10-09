package main

import (
	"backend/algorithm"
	"backend/middleware"
	"fmt"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"log"
	"net/http"
	"os"

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

	db.AutoMigrate(&models.Room{}, &models.Item{}, &models.User{})

	simplifier := algorithm.Simplifier{}
	auth := middleware.Auth{JWTKey: []byte(jwtkey)}

	h := handlers.Handler{DB: db, Simplifier: &simplifier, Auth: &auth}

	router := httprouter.New()

	// Rooms
	router.POST("/rooms", h.CreateRoom)
	router.GET("/rooms/:roomID", h.GetRoomInfo)
	router.POST("/rooms/:roomID", h.JoinRoom)
	router.POST("/rooms/:roomID/leave", h.LeaveRoom)
	router.GET("/rooms/:roomID/users", h.GetUsersInRoom)

	// Items
	router.GET("/rooms/:roomID/items", h.GetItems)
	router.POST("/rooms/:roomID/items", h.CreateItem)
	router.DELETE("/rooms/:roomID/items/:itemID", h.DeleteItem)
	router.GET("/rooms/:roomID/simplified_items", h.GetSimplifiedItems)
	router.POST("/rooms/:roomID/simplify", h.SimplifyItems)

	// Users
	router.POST("/users/register", h.CreateUser)
	router.POST("/users/login", h.LoginUser)
	router.GET("/users/:userID", auth.JWTAuth(h.GetUserInfo))

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	corsHandler := c.Handler(router)

	log.Println("Server running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", corsHandler))
}
