package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;

public record PriorityResponse( Long priorityId,
        @NotBlank(message = "Priority should not be blank") String name,
                               String description) {
}
