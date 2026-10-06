package com.datansh.HelpDesk.dto;

import com.datansh.HelpDesk.enums.TicketStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TicketResponse(
        UUID ticketPublicId,
        String title,
        String description,
        Long categoryId,
        String categoryName,
        Long priorityId,
        String priorityName,
        UUID requestorPublicId,
        String requestorName,
        String requestorEmail,
        TicketStatus status,
        OffsetDateTime responseDeadline,
        OffsetDateTime resolutionDeadline,
        Boolean isResponseOverdue,
        Boolean isResponseAtRisk,
        Boolean isResolutionOverdue,
        Boolean isResolutionAtRisk,
        List<AttachmentResponse> attachments,
        OffsetDateTime createdAt,
        UUID assignedAgentPublicId,
        String assignedAgentName,
        String assignedAgentEmail
) {
    public TicketResponse(
            UUID ticketPublicId,
            String title,
            String description,
            Long categoryId,
            String categoryName,
            Long priorityId,
            String priorityName,
            UUID requestorPublicId,
            String requestorName,
            String requestorEmail,
            TicketStatus status,
            OffsetDateTime responseDeadline,
            OffsetDateTime resolutionDeadline,
            Boolean isResponseOverdue,
            Boolean isResponseAtRisk,
            Boolean isResolutionOverdue,
            Boolean isResolutionAtRisk,
            List<AttachmentResponse> attachments,
            OffsetDateTime createdAt
    ) {
        this(ticketPublicId, title, description, categoryId, categoryName, priorityId, priorityName,
                requestorPublicId, requestorName, requestorEmail, status, responseDeadline, resolutionDeadline,
                isResponseOverdue, isResponseAtRisk, isResolutionOverdue, isResolutionAtRisk,
                attachments, createdAt, null, null, null);
    }
}
