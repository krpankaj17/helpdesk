package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.NotificationResponse;
import com.datansh.HelpDesk.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {
    private static final Logger log = LoggerFactory.getLogger(NotificationController.class);
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getUserNotifications(
            @RequestParam(required = false) Boolean unreadOnly,
            @org.springdoc.core.annotations.ParameterObject Pageable pageable) {
        return ResponseEntity.ok(notificationService.getUserNotifications(unreadOnly, pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long id) {
        log.info("REST request to mark notification #{} as read", id);
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead() {
        log.info("REST request to mark all notifications as read");
        notificationService.markAllAsRead();
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        log.info("REST request to delete notification #{}", id);
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<Map<String, String>> clearAllNotifications() {
        log.info("REST request to clear all notifications");
        notificationService.clearAllNotifications();
        return ResponseEntity.ok(Map.of("message", "All notifications cleared"));
    }
}
