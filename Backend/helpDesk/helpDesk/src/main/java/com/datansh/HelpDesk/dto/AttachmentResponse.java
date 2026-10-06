package com.datansh.HelpDesk.dto;

import java.time.OffsetDateTime;

public record AttachmentResponse(
        Long attachmentId,
        String title,
        String description,
        String url,
        OffsetDateTime createdAt
) {}
