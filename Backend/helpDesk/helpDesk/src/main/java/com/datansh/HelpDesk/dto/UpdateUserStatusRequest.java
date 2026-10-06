package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "isActive status is required")
        Boolean isActive
) {
}
