package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateCommentRequest(
        @NotBlank(message = "Comment description is required")
        String description,
        List<CreateAttachmentRequest> attachments
) {}
