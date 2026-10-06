package com.datansh.HelpDesk.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {
    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.access-token.expiration:900000}")
    private long accessTokenExpirationMs = 900000L;

    @Value("${jwt.refresh-token.expiration:604800000}")
    private long refreshTokenExpirationMs = 604800000L;

    public String generateToken(Authentication authentication) {
        List<String> authorities = authentication.getAuthorities()
                .stream().map(GrantedAuthority::getAuthority)
                .toList();
        return generateAccessToken(authentication.getName(), authorities);
    }

    public String generateAccessToken(String username, List<String> authorities) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim("type", "ACCESS")
                .claim("authorities", authorities)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(String username) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim("type", "REFRESH")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public boolean isRefreshToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return "REFRESH".equals(claims.get("type", String.class));
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String type = claims.get("type", String.class);
            return type == null || "ACCESS".equals(type);
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public List<String> extractAuthorities(String token) {
        List<?> authorities = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("authorities", List.class);

        if (authorities == null) {
            return List.of();
        }

        return authorities.stream()
                .map(Object::toString)
                .toList();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
