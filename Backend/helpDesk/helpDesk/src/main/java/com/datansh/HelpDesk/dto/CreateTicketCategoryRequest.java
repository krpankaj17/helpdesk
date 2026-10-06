package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateTicketCategoryRequest(@NotBlank(message = "Category name should not be null") String name,
                                          String description) {
}
