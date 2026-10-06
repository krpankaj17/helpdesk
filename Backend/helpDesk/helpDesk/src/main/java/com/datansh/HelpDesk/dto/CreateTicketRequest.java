package com.datansh.HelpDesk.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateTicketRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 80, message = "Title must not exceed 80 characters")
        String title,

        String description,

        @NotNull(message = "Category ID is required")
        Long category,

        @NotNull(message = "Priority ID is required")
        Long priority,

        @Valid
        List<CreateAttachmentRequest> attachments
) {
}
