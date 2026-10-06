package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.NotificationResponse;
import com.datansh.HelpDesk.entity.Notification;
import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.NotificationRepository;
import com.datansh.HelpDesk.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public Page<NotificationResponse> getUserNotifications(Boolean unreadOnly, Pageable pageable) {
        User currentUser = getAuthenticatedUser();
        Page<Notification> notifications;

        if (Boolean.TRUE.equals(unreadOnly)) {
            notifications = notificationRepository.findByUserAndIsReadFalseOrderByCreatedAtDesc(currentUser, pageable);
        } else {
            notifications = notificationRepository.findByUserOrderByCreatedAtDesc(currentUser, pageable);
        }

        return notifications.map(this::mapToResponse);
    }

    public long getUnreadCount() {
        User currentUser = getAuthenticatedUser();
        return notificationRepository.countByUserAndIsReadFalse(currentUser);
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId) {
        User currentUser = getAuthenticatedUser();
        Notification notification = notificationRepository.findByNotificationIdAndUser(notificationId, currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        notification.setIsRead(true);
        Notification saved = notificationRepository.save(notification);
        log.info("Notification #" + notificationId + " marked as read for user " + currentUser.getEmail());
        return mapToResponse(saved);
    }

    @Transactional
    public void markAllAsRead() {
        User currentUser = getAuthenticatedUser();
        notificationRepository.markAllAsReadForUser(currentUser);
        log.info("All notifications marked as read for user " + currentUser.getEmail());
    }

    @Transactional
    public void deleteNotification(Long notificationId) {
        User currentUser = getAuthenticatedUser();
        Notification notification = notificationRepository.findByNotificationIdAndUser(notificationId, currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));
        notificationRepository.delete(notification);
        log.info("Notification #{} deleted for user {}", notificationId, currentUser.getEmail());
    }

    @Transactional
    public void clearAllNotifications() {
        User currentUser = getAuthenticatedUser();
        notificationRepository.deleteAllByUser(currentUser);
        log.info("All notifications cleared for user {}", currentUser.getEmail());
    }

    @Transactional
    public Notification createNotification(User recipient, Ticket ticket, String title, String message, String type) {
        if (recipient == null) {
            return null;
        }

        Notification notification = Notification.builder()
                .user(recipient)
                .ticket(ticket)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Notification created for " + recipient.getEmail() + " of type " + type);
        return saved;
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));
    }

    private NotificationResponse mapToResponse(Notification n) {
        Long ticketId = n.getTicket() != null ? n.getTicket().getTicketId() : null;
        UUID ticketPublicId = n.getTicket() != null ? n.getTicket().getTicketPublicId() : null;

        return new NotificationResponse(
                n.getNotificationId(),
                ticketId,
                ticketPublicId,
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getIsRead(),
                n.getCreatedAt()
        );
    }
}
