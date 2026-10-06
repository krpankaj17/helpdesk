package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.Positive;

public record UpdateSlaPolicyRequest(
        Long priorityId,
        String description,
        @Positive(message = "Response time must be greater than 0")
        Long responseTimeMinutes,
        @Positive(message = "Resolution time must be greater than 0")
        Long resolutionTimeMinutes
) {}
