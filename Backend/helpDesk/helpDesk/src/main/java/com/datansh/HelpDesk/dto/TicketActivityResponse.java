package com.datansh.HelpDesk.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TicketActivityResponse(
        Long activityId,
        UUID ticketPublicId,
        String description,
        UUID userPublicId,
        String userName,
        String userRole,
        OffsetDateTime createdAt
) {}
