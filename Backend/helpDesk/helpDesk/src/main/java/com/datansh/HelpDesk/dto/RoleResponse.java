package com.datansh.HelpDesk.dto;

import java.util.List;

public record RoleResponse(
        Long id,
        String name,
        String description,
        List<PermissionResponse> permissions
) {
    public RoleResponse(Long id, String name, String description) {
        this(id, name, description, List.of());
    }
}
