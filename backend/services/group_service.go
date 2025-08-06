package services

import (
	"database/sql"
	"errors"
	"fmt"
	"social/models"
	"social/repositories"
	"time"
)

var (
	ErrUnauthorized = errors.New("user not authorized")
	ErrInvalidDate  = errors.New("invalid date format")
	ErrEmptyMessage = errors.New("message content cannot be empty")
)

type GroupService struct {
	repo *repositories.GroupRepository
}

func NewGroupService(repo *repositories.GroupRepository) *GroupService {
	return &GroupService{repo: repo}
}

func (s *GroupService) GetGroupDetailsByID(groupID, userID int) (*models.GroupResponse, error) {
	return s.repo.GetGroupDetailsByID(groupID, userID)
}

func (s *GroupService) CheckUserAccessStatus(groupID, userID int) (string, error) {
	creatorID, err := s.repo.GetGroupCreatorID(groupID)
	if err != nil {
		return "", err
	}

	if userID == creatorID {
		return "creator", nil
	}

	status, err := s.repo.GetMembershipStatus(groupID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return "none", nil
		}
		return "", err
	}

	return status, nil
}

func (s *GroupService) GetPendingRequests(groupID, userID int) ([]models.PendingRequest, error) {
	creatorID, err := s.repo.GetGroupCreatorID(groupID)
	if err != nil {
		return nil, err
	}

	if creatorID != userID {
		return nil, fmt.Errorf("only group creator can view pending requests")
	}

	requests, err := s.repo.GetPendingRequests(groupID)
	if err != nil {
		return nil, err
	}

	return requests, nil
}

func (s *GroupService) JoinGroupRequest(groupID, userID int) error {
	exists, err := s.repo.CheckMembershipExists(groupID, userID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("request already exists or already a member")
	}

	err = s.repo.CreateJoinRequest(groupID, userID)
	if err != nil {
		return err
	}
	return nil
}

func (s *GroupService) AcceptInvite(groupID, userID int) error {
	status, err := s.repo.GetMembershipStatus(groupID, userID)
	if err != nil {
		return fmt.Errorf("membership not found")
	}

	if status != "invited" {
		return fmt.Errorf("user is not invited")
	}

	err = s.repo.UpdateMembershipStatus(groupID, userID, "accepted")
	if err != nil {
		return err
	}

	return nil
}

func (s *GroupService) InviteUserToGroup(groupID int, creatorID int, invite models.InviteRequest) error {
	dbCreatorID, err := s.repo.GetGroupCreatorID(groupID)
	if err != nil {
		return fmt.Errorf("group not found")
	}

	if dbCreatorID != creatorID {
		return fmt.Errorf("not authorized")
	}

	err = s.repo.UpsertGroupInvitation(groupID, invite.UserID)
	if err != nil {
		return err
	}

	return nil
}

func (s *GroupService) ApproveMembership(groupID int, creatorID int, body models.ApproveRequest) error {
	dbCreatorID, err := s.repo.GetGroupCreatorID(groupID)
	if err != nil {
		return fmt.Errorf("group not found")
	}

	if dbCreatorID != creatorID {
		return fmt.Errorf("forbidden")
	}

	err = s.repo.ApproveMembershipRequest(groupID, body.UserID)
	if err != nil {
		return err
	}

	return nil
}

func (s *GroupService) DeclineMembership(groupID int, creatorID int, body models.DeclineRequest) error {
	dbCreatorID, err := s.repo.GetGroupCreatorID(groupID)
	if err != nil {
		return fmt.Errorf("group not found")
	}
	if dbCreatorID != creatorID {
		return fmt.Errorf("forbidden")
	}

	err = s.repo.DeclineMembershipRequest(groupID, body.UserID)
	if err != nil {
		return err
	}
	return nil
}

func (s *GroupService) GetNonGroupMembers(groupID, userID int) ([]map[string]interface{}, error) {
	return s.repo.GetNonGroupMembers(groupID, userID)
}

func (s *GroupService) GetGroupPosts(groupID, userID int) ([]models.GroupPost, error) {
	return s.repo.GetGroupPosts(groupID, userID)
}

func (s *GroupService) IsGroupMember(groupID, userID int) (bool, error) {
	return s.repo.IsGroupMember(groupID, userID)
}

func (s *GroupService) CreateGroupPost(post models.GroupPost) (*models.GroupPost, error) {
	return s.repo.CreateGroupPost(post)
}

func (s *GroupService) GetGroupPostComments(postID, userID int) ([]models.GroupPostComment, error) {
	return s.repo.GetGroupPostComments(postID, userID)
}

func (s *GroupService) CreateGroupPostComment(userID, postID int, content string) (models.GroupPostComment, error) {
	comment := models.GroupPostComment{
		PostID:   postID,
		AuthorID: userID,
		Content:  content,
	}

	created, err := s.repo.CreateGroupPostComment(comment)
	if err != nil {
		return models.GroupPostComment{}, err
	}

	fullComment, err := s.repo.GetGroupPostCommentByID(created.ID)
	if err != nil {
		return models.GroupPostComment{}, err
	}

	return fullComment, nil
}

func (s *GroupService) GetGroupEvents(userID, groupID int) ([]models.GroupEvent, error) {
	// Step 1: Check if user is a member or creator
	ok, err := s.repo.IsGroupMember(groupID, userID)
	if !ok || err != nil {
		return nil, fmt.Errorf("membership check failed: %w", err)
	}
	events, err := s.repo.GetGroupEvents(groupID, userID)
	if err != nil {
		return nil, err
	}
	return events, nil
}

func (s *GroupService) CreateGroupEvent(userID int, req models.CreateEventRequest) (models.GroupEvent, error) {
	// Check membership
	isMember, err := s.repo.IsGroupMember(req.GroupID, userID)
	if err != nil {
		return models.GroupEvent{}, fmt.Errorf("membership check failed: %w", err)
	}
	if !isMember {
		return models.GroupEvent{}, ErrUnauthorized
	}

	// Parse date
	eventDate, err := time.Parse(time.RFC3339, req.EventDate)
	if err != nil {
		return models.GroupEvent{}, ErrInvalidDate
	}

	event := models.GroupEvent{
		GroupID:     req.GroupID,
		CreatorID:   userID,
		Title:       req.Title,
		Description: req.Description,
		EventDate:   eventDate,
	}

	createdEvent, err := s.repo.CreateGroupEvent(event)
	if err != nil {
		return models.GroupEvent{}, err
	}

	fullEvent, err := s.repo.GetGroupEventWithCreator(createdEvent.ID)
	if err != nil {
		return models.GroupEvent{}, err
	}

	return fullEvent, nil
}

func (s *GroupService) SendGroupMessage(userID int, groupID int, content string) (models.Message, error) {
	// Check if user is a member
	isMember, err := s.repo.IsGroupMember(groupID, userID)
	if err != nil {
		return models.Message{}, fmt.Errorf("membership check failed: %w", err)
	}
	if !isMember {
		return models.Message{}, ErrUnauthorized
	}

	// Insert message
	_, err = s.repo.InsertGroupMessage(groupID, userID, content)
	if err != nil {
		return models.Message{}, fmt.Errorf("insert failed: %w", err)
	}

	// Return message object
	return models.Message{
		From:      userID,
		GroupID:   groupID,
		Content:   content,
		Type:      "group",
		Timestamp: time.Now().Format(time.RFC3339),
	}, nil
}

func (s *GroupService) GetGroupsForUser(userID int) ([]models.GroupWithStatus, error) {
	return s.repo.GetAllGroups(userID)
}

func (s *GroupService) CreateGroup(userID int, req models.CreateGroupRequest) (models.Group, error) {
	group := models.Group{
		Name:       req.Title,
		Description: req.Description,
		OwnerID:   userID,
	}

	return s.repo.CreateGroup(group)
}

// Add this to your service methods
func (s *GroupService) SetEventResponse(userID, eventID int, response string) error {
    // Validate response type
    if response != "going" && response != "not_going" {
        return fmt.Errorf("invalid response type")
    }

    // Get event to verify group membership
    event, err := s.repo.GetGroupEventWithCreator(eventID)
    if err != nil {
        return fmt.Errorf("event lookup failed: %w", err)
    }

    // Check if user is member of the group
    isMember, err := s.repo.IsGroupMember(event.GroupID, userID)
    if err != nil || !isMember {
        return ErrUnauthorized
    }

    // Set the response
    err = s.repo.SetEventResponse(eventID, userID, response)
    if err != nil {
        return fmt.Errorf("failed to set response: %w", err)
    }

    return nil
}