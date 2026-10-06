package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AssignRolePermissionsRequest(
        @NotNull(message = "permissionIds cannot be null")
        List<Long> permissionIds
) {
}
