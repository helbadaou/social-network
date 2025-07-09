package utils

import (
    "fmt"
    "net/mail"
    "regexp"
    "strings"
    "time"
)

func ValidateEmail(email string) error {
    if email == "" {
        return fmt.Errorf("email is required")
    }
    
    _, err := mail.ParseAddress(email)
    if err != nil {
        return fmt.Errorf("invalid email format")
    }
    
    return nil
}

func ValidatePassword(password string) error {
    if len(password) < 6 {
        return fmt.Errorf("password must be at least 6 characters long")
    }
    
    return nil
}

func ValidateName(name, fieldName string) error {
    if name == "" {
        return fmt.Errorf("%s is required", fieldName)
    }
    
    if len(name) < 2 {
        return fmt.Errorf("%s must be at least 2 characters long", fieldName)
    }
    
    // Check if name contains only letters, spaces, and hyphens
    matched, _ := regexp.MatchString(`^[a-zA-Z\s\-]+$`, name)
    if !matched {
        return fmt.Errorf("%s can only contain letters, spaces, and hyphens", fieldName)
    }
    
    return nil
}

func ValidateDateOfBirth(dateStr string) error {
    if dateStr == "" {
        return fmt.Errorf("date of birth is required")
    }
    
    // Parse the date
    date, err := time.Parse("2006-01-02", dateStr)
    if err != nil {
        return fmt.Errorf("invalid date format. Use YYYY-MM-DD")
    }
    
    // Check if date is in the future
    if date.After(time.Now()) {
        return fmt.Errorf("date of birth cannot be in the future")
    }
    
    // Check if user is at least 13 years old
    thirteenYearsAgo := time.Now().AddDate(-13, 0, 0)
    if date.After(thirteenYearsAgo) {
        return fmt.Errorf("user must be at least 13 years old")
    }
    
    return nil
}

func ValidatePrivacyLevel(level string) error {
    validLevels := []string{"public", "almost_private", "private"}
    
    for _, valid := range validLevels {
        if level == valid {
            return nil
        }
    }
    
    return fmt.Errorf("invalid privacy level. Must be one of: %s", strings.Join(validLevels, ", "))
}

func ValidateContent(content string) error {
    if content == "" {
        return fmt.Errorf("content is required")
    }
    
    if len(content) > 500 {
        return fmt.Errorf("content cannot exceed 500 characters")
    }
    
    return nil
}