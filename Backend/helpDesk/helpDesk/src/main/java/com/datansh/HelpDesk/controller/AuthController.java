package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.config.CustomUserDetailService;
import com.datansh.HelpDesk.dto.LoginRequest;
import com.datansh.HelpDesk.dto.LoginResponse;
import com.datansh.HelpDesk.dto.RefreshTokenRequest;
import com.datansh.HelpDesk.security.JwtService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RestController
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CustomUserDetailService customUserDetailService;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          CustomUserDetailService customUserDetailService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.customUserDetailService = customUserDetailService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest loginRequest) {
        String normalizedEmail = loginRequest.email() != null ? loginRequest.email().trim().toLowerCase() : "";
        log.info("Processing login attempt for: " + normalizedEmail);
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                normalizedEmail,
                loginRequest.password()
        );
        Authentication authentication = authenticationManager.authenticate(authenticationToken);
        log.info("User successfully authenticated: " + normalizedEmail);

        String accessToken = jwtService.generateToken(authentication);
        String refreshToken = jwtService.generateRefreshToken(authentication.getName());

        return ResponseEntity.ok(new LoginResponse(accessToken, refreshToken));
    }

    @PostMapping({"/refresh-token", "/refresh"})
    public ResponseEntity<LoginResponse> refreshToken(@RequestBody @Valid RefreshTokenRequest request) {
        String token = request.refreshToken();
        if (!jwtService.isRefreshToken(token)) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (Exception e) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        UserDetails userDetails = customUserDetailService.loadUserByUsername(username);
        if (!userDetails.isEnabled()) {
            throw new DisabledException("User account is disabled. Please contact an administrator.");
        }

        List<String> authorities = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        String newAccessToken = jwtService.generateAccessToken(username, authorities);
        String newRefreshToken = jwtService.generateRefreshToken(username);

        log.info("Token successfully refreshed for: {}", username);
        return ResponseEntity.ok(new LoginResponse(newAccessToken, newRefreshToken));
    }
}
