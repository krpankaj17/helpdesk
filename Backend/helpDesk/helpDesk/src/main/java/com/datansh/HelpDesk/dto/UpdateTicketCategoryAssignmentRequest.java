package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateTicketCategoryAssignmentRequest(
        @NotNull(message = "Category ID is required")
        Long categoryId
) {
}
