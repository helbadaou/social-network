package sqlite

import (
    "database/sql"
    "fmt"
    "log"
    "sync"
    
    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/sqlite3"
    "github.com/golang-migrate/migrate/v4/source/file"
    _ "github.com/mattn/go-sqlite3"
)

var (
    db   *sql.DB
    once sync.Once
)

func InitDB() (*sql.DB, error) {
    var err error
    once.Do(func() {
        db, err = sql.Open("sqlite3", "social_network.db")
        if err != nil {
            log.Fatal("Failed to connect to database:", err)
            return
        }
        
        // Enable foreign keys
        _, err = db.Exec("PRAGMA foreign_keys = ON")
        if err != nil {
            log.Fatal("Failed to enable foreign keys:", err)
            return
        }
        
        // Test connection
        err = db.Ping()
        if err != nil {
            log.Fatal("Failed to ping database:", err)
            return
        }
        
        log.Println("Successfully connected to SQLite database")
    })
    
    return db, err
}

func GetDB() *sql.DB {
    if db == nil {
        log.Fatal("Database not initialized. Call InitDB() first.")
    }
    return db
}

func RunMigrations() error {
    if db == nil {
        return fmt.Errorf("database not initialized")
    }
    
    driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
    if err != nil {
        return fmt.Errorf("failed to create migration driver: %v", err)
    }
    
    fileSource, err := (&file.File{}).Open("file://pkg/db/migrations/sqlite")
    if err != nil {
        return fmt.Errorf("failed to open migration files: %v", err)
    }
    
    m, err := migrate.NewWithInstance("file", fileSource, "sqlite3", driver)
    if err != nil {
        return fmt.Errorf("failed to create migration instance: %v", err)
    }
    
    err = m.Up()
    if err != nil && err != migrate.ErrNoChange {
        return fmt.Errorf("failed to run migrations: %v", err)
    }
    
    if err == migrate.ErrNoChange {
        log.Println("No new migrations to apply")
    } else {
        log.Println("Migrations applied successfully")
    }
    
    return nil
}

func CloseDB() error {
    if db != nil {
        return db.Close()
    }
    return nil
}