package middleware

import (
	"backend/models"
	"context"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
)

type Auth struct {
	JWTKey []byte
}

func (a *Auth) JWTAuth(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "INVALID_TOKEN", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		claims := &jwt.StandardClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return a.JWTKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "INVALID_TOKEN", http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(claims.Subject)
		if err != nil {
			http.Error(w, "INVALID_USER_ID", http.StatusInternalServerError)
		}
		ctx := context.WithValue(r.Context(), "userID", userID)
		next(w, r.WithContext(ctx), ps)
	}
}

func (a *Auth) GenerateToken(user *models.User) (string, error) {
	expirationTime := time.Now().Add(12 * time.Hour)
	claims := &jwt.StandardClaims{
		Subject:   user.ID.String(),
		ExpiresAt: expirationTime.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(a.JWTKey)
	if err != nil {
		return "", err
	}
	return tokenString, nil
}
