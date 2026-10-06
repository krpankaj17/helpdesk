package com.datansh.HelpDesk.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        Long expiresIn
) {
    public LoginResponse(String accessToken, String refreshToken) {
        this(accessToken, refreshToken, "Bearer", 900L);
    }
}
