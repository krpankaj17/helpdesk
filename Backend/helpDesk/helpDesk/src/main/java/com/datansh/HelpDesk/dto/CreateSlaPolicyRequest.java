package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateSlaPolicyRequest(
        @NotNull(message = "Priority ID is required")
        Long priorityId,
        String description,
        @NotNull(message = "Response time in minutes is required")
        @Positive(message = "Response time must be greater than 0")
        Long responseTimeMinutes,
        @NotNull(message = "Resolution time in minutes is required")
        @Positive(message = "Resolution time must be greater than 0")
        Long resolutionTimeMinutes
) {}
