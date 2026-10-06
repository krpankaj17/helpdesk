package com.datansh.HelpDesk.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record NoteResponse(
        Long noteId,
        UUID ticketPublicId,
        UUID userPublicId,
        String userName,
        String userRole,
        String description,
        List<AttachmentResponse> attachments,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
