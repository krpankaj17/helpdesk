package com.datansh.HelpDesk.dto;

public record SlaPolicyResponse(
        Long policyId,
        Long priorityId,
        String priorityName,
        String description,
        Long responseTimeMinutes,
        Long resolutionTimeMinutes
) {}
