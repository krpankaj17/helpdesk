package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTicketCategoryRequest(@NotBlank(message = "Category name must not be empty") String name ,
                                          String description) {
}
