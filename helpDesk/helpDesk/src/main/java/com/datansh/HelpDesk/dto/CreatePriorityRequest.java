package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePriorityRequest(@NotBlank(message = "priority name should not be null") String name,
                                    String description) {
}
