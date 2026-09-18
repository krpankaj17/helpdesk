package com.datansh.HelpDesk.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "Email is Required")
        @Email(message = "Invalid email format")
        String email,
        @NotBlank(message = "Password is empty")
        @Size(min = 8 ,message ="Password must be 8 character")
        String password,
        @NotBlank(message = "Name is Empty")
        @Size(min = 1,message = "Name must be least one character")
        String name
) {


}
