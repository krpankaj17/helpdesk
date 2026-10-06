package com.datansh.HelpDesk.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateUserResponse(
        UUID userPublicId,
        String name,
        String email,
        Boolean isActive,
        String roleName,
        OffsetDateTime createdAt
) {
    public CreateUserResponse(UUID userPublicId, String name, String email, Boolean isActive, String roleName) {
        this(userPublicId, name, email, isActive, roleName, null);
    }
}
