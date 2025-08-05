// services/post_service.go
package services

import (
	"social/models"
	"social/repositories"
	"time"
)

type PostService struct {
	repo *repositories.PostRepository
}

func NewPostService(repo *repositories.PostRepository) *PostService {
	return &PostService{repo: repo}
}

func (s *PostService) GetUserPosts(userID int) ([]models.Post, error) {
	return s.repo.GetPostsByUserID(userID)
}

func (s *PostService) CreatePost(authorID int, content, imageURL, privacy string, recipientIDs []int) error {
	post := models.PostFetch{
		AuthorID:  authorID,
		Content:   content,
		ImageURL:  imageURL,
		Privacy:   privacy,
		CreatedAt: time.Now(),
	}
	return s.repo.CreatePost(post, recipientIDs)
}

func (s *PostService) GetPostsForUser(userID int) ([]models.PostFetch, error) {
	return s.repo.GetPostsForUser(userID)
}

func (s *PostService) GetCommentsByPost(postID string) ([]models.CommentWithUser, error) {
	return s.repo.GetCommentsByPost(postID)
}

func (s *PostService) CreateComment(postID string, userID int, content, image string) error {
	createdAt := time.Now().Format("2006-01-02 15:04:05")
	return s.repo.InsertComment(postID, userID, content, image, createdAt)
}
