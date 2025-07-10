package utils

import (
	"fmt"
	"image"
	// "image/gif"
	// "image/jpeg"
	// "image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Supported image formats
var supportedFormats = map[string]bool{
	"jpeg": true,
	"jpg":  true,
	"png":  true,
	"gif":  true,
}

// Maximum file size (5MB)
const maxFileSize = 5 * 1024 * 1024

// ImageUploadResult represents the result of an image upload
type ImageUploadResult struct {
	Filename string `json:"filename"`
	Path     string `json:"path"`
	URL      string `json:"url"`
	Size     int64  `json:"size"`
	Format   string `json:"format"`
}

// ValidateImageFile validates if the uploaded file is a valid image
func ValidateImageFile(file multipart.File, header *multipart.FileHeader) error {
	// Check file size
	if header.Size > maxFileSize {
		return fmt.Errorf("file size exceeds maximum limit of %d bytes", maxFileSize)
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		return fmt.Errorf("file has no extension")
	}
	
	ext = ext[1:] // Remove the dot
	if !supportedFormats[ext] {
		return fmt.Errorf("unsupported file format: %s", ext)
	}

	// Reset file pointer to beginning
	file.Seek(0, io.SeekStart)

	// Validate image format by decoding
	_, format, err := image.DecodeConfig(file)
	if err != nil {
		return fmt.Errorf("invalid image file: %v", err)
	}

	// Check if decoded format matches extension
	if !supportedFormats[format] {
		return fmt.Errorf("image format %s does not match file extension %s", format, ext)
	}

	// Reset file pointer again
	file.Seek(0, io.SeekStart)

	return nil
}

// SaveImage saves an uploaded image to the specified directory
func SaveImage(file multipart.File, header *multipart.FileHeader, uploadDir string) (*ImageUploadResult, error) {
	// Validate the image file
	if err := ValidateImageFile(file, header); err != nil {
		return nil, err
	}

	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %v", err)
	}

	// Generate unique filename
	ext := strings.ToLower(filepath.Ext(header.Filename))
	filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %v", err)
	}
	defer dst.Close()

	// Copy the uploaded file to the destination
	size, err := io.Copy(dst, file)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %v", err)
	}

	// Get the image format
	file.Seek(0, io.SeekStart)
	_, format, _ := image.DecodeConfig(file)

	// Generate URL (relative path from uploads directory)
	url := fmt.Sprintf("/uploads/%s/%s", filepath.Base(uploadDir), filename)

	return &ImageUploadResult{
		Filename: filename,
		Path:     filePath,
		URL:      url,
		Size:     size,
		Format:   format,
	}, nil
}

// SaveAvatar saves an avatar image
func SaveAvatar(file multipart.File, header *multipart.FileHeader) (*ImageUploadResult, error) {
	return SaveImage(file, header, "uploads/avatars")
}

// SavePostImage saves a post image
func SavePostImage(file multipart.File, header *multipart.FileHeader) (*ImageUploadResult, error) {
	return SaveImage(file, header, "uploads/posts")
}

// DeleteImage deletes an image file
func DeleteImage(filePath string) error {
	if filePath == "" {
		return nil
	}

	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file: %v", err)
	}

	return nil
}

// GetImageInfo gets information about an image file
func GetImageInfo(filePath string) (*ImageUploadResult, error) {
	// Check if file exists
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("file not found: %v", err)
	}

	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	// Get image config
	_, format, err := image.DecodeConfig(file)
	if err != nil {
		return nil, fmt.Errorf("invalid image file: %v", err)
	}

	return &ImageUploadResult{
		Filename: filepath.Base(filePath),
		Path:     filePath,
		Size:     info.Size(),
		Format:   format,
	}, nil
}

// ResizeImage resizes an image (basic implementation)
func ResizeImage(srcPath, dstPath string, maxWidth, maxHeight int) error {
	// Open source file
	src, err := os.Open(srcPath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %v", err)
	}
	defer src.Close()

	// Decode image
	img, _, err := image.Decode(src)
	if err != nil {
		return fmt.Errorf("failed to decode image: %v", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	// Calculate new dimensions while maintaining aspect ratio
	newWidth := origWidth
	newHeight := origHeight

	if origWidth > maxWidth {
		newWidth = maxWidth
		newHeight = (origHeight * maxWidth) / origWidth
	}

	if newHeight > maxHeight {
		newHeight = maxHeight
		newWidth = (origWidth * maxHeight) / origHeight
	}

	// If no resizing needed, just copy the file
	if newWidth == origWidth && newHeight == origHeight {
		return copyFile(srcPath, dstPath)
	}

	// Create destination file
	dst, err := os.Create(dstPath)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %v", err)
	}
	defer dst.Close()

	// For this basic implementation, we'll just copy the original
	// In a production environment, you'd want to use a proper image resizing library
	src.Seek(0, io.SeekStart)
	_, err = io.Copy(dst, src)
	if err != nil {
		return fmt.Errorf("failed to copy image: %v", err)
	}

	return nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// GetImageMimeType returns the MIME type of an image based on its format
func GetImageMimeType(format string) string {
	switch strings.ToLower(format) {
	case "jpeg", "jpg":
		return "image/jpeg"
	case "png":
		return "image/png"
	case "gif":
		return "image/gif"
	default:
		return "application/octet-stream"
	}
}

// IsValidImageFormat checks if the given format is supported
func IsValidImageFormat(format string) bool {
	return supportedFormats[strings.ToLower(format)]
}

// ProcessImageUpload processes an image upload with validation and saving
func ProcessImageUpload(file multipart.File, header *multipart.FileHeader, uploadType string) (*ImageUploadResult, error) {
	switch uploadType {
	case "avatar":
		return SaveAvatar(file, header)
	case "post":
		return SavePostImage(file, header)
	default:
		return nil, fmt.Errorf("unsupported upload type: %s", uploadType)
	}
}