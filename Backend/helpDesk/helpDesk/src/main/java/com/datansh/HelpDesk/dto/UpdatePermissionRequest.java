package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePermissionRequest(@NotBlank(message = "Permission name should not be blank") String name,
                                      String description) {
}
