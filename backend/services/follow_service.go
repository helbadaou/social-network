package services

import (
	"social/models"
	"social/repositories"
)

type FollowService struct {
	Repo *repositories.FollowRepository
}

func NewFollowService(repo *repositories.FollowRepository) *FollowService {
	return &FollowService{Repo: repo}
}

func (s *FollowService) SendFollowRequest(followerID, followedID int) (string, error) {
	exists, err := s.Repo.FollowExists(followerID, followedID)
	if err != nil {
		return "", err
	}
	if exists {
		return "already_following", nil
	}

	isPrivate, err := s.Repo.IsPrivate(followedID)
	if err != nil {
		return "", err
	}

	status := "pending"
	if !isPrivate {
		status = "accepted"
	}

	req := models.FollowRequest{
		FollowerID: followerID,
		FollowedID: followedID,
		Status:     status,
	}

	err = s.Repo.InsertFollow(req)
	if err != nil {
		return "", err
	}

	return status, nil
}

func (s *FollowService) GetFollowStatus(followerID, followedID int) (string, error) {
	return s.Repo.GetFollowStatus(followerID, followedID)
}

func (s *FollowService) AcceptFollowRequest(senderID, receiverID int) error {
	err := s.Repo.AcceptFollowRequest(senderID, receiverID)
	if err != nil {
		return err
	}
	return s.Repo.UpdateFollowNotificationStatus(senderID, receiverID, "accepted")
}

func (s *FollowService) RejectFollowRequest(senderID, receiverID int) error {
	err := s.Repo.RejectFollowRequest(senderID, receiverID)
	if err != nil {
		return err
	}
	return s.Repo.UpdateFollowNotificationStatus(senderID, receiverID, "rejected")
}

func (s *FollowService) UnfollowUser(followerID, followedID int) error {
	return s.Repo.UnfollowUser(followerID, followedID)
}

func (s *FollowService) GetFollowers(userID int) ([]models.Follower, error) {
	return s.Repo.GetFollowers(userID)
}

func (s *FollowService) GetFollowing(userID int) ([]models.Following, error) {
	return s.Repo.GetFollowing(userID)
}

func (s *FollowService) GetAcceptedFollowers(userID int) ([]models.Follower, error) {
	return s.Repo.GetAcceptedFollowers(userID)
}