package com.datansh.HelpDesk.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationResponse(
        Long notificationId,
        Long ticketId,
        UUID ticketPublicId,
        String title,
        String message,
        String type,
        Boolean isRead,
        OffsetDateTime createdAt
) {
}
