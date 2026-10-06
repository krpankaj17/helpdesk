package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateAttachmentRequest(
        @NotBlank(message = "Attachment title is required")
        String title,
        String description,
        @NotBlank(message = "Attachment URL is required")
        String url
) {}
