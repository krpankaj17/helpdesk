package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateNoteRequest(
        @NotBlank(message = "Note description is required")
        String description,
        List<CreateAttachmentRequest> attachments
) {}
