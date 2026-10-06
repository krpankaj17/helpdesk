package com.datansh.HelpDesk.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TicketAssignmentResponse(
        Long assignmentId,
        UUID ticketPublicId,
        UUID assignedToPublicId,
        String assignedToName,
        String assignedToEmail,
        UUID assignedByPublicId,
        String assignedByName,
        Boolean isActive,
        OffsetDateTime assignedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
