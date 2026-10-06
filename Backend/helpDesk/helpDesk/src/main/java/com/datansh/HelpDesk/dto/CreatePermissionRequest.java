package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePermissionRequest(@NotBlank(message = "Permission name should not be empty") String name,
                                      String description) {
}
