package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @Email(message = "Invalid email format")
        String email,
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,
        @Size(min = 1, message = "Name must be at least one character")
        String name,
        Long roleId
) {
}
