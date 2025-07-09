package utils

import (
    "encoding/json"
    "net/http"
)

type Response struct {
    Success bool        `json:"success"`
    Message string      `json:"message,omitempty"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

func SendSuccessResponse(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    
    response := Response{
        Success: true,
        Data:    data,
    }
    
    json.NewEncoder(w).Encode(response)
}

func SendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    
    response := Response{
        Success: false,
        Error:   message,
    }
    
    json.NewEncoder(w).Encode(response)
}

func SendMessageResponse(w http.ResponseWriter, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    
    response := Response{
        Success: true,
        Message: message,
    }
    
    json.NewEncoder(w).Encode(response)
}