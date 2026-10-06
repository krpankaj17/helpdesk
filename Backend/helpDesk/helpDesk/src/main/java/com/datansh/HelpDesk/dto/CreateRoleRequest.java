package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateRoleRequest(
        @NotBlank String name,
        String description,
        List<Long> permissionIds
) {
    public CreateRoleRequest(String name, String description) {
        this(name, description, null);
    }
}
