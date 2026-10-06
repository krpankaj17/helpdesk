package com.datansh.HelpDesk.security;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final JwtService jwtService;

    public  JwtAuthenticationFilter(JwtService jwtService ){
        this.jwtService = jwtService;

    }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if(authHeader ==null || !authHeader.startsWith("Bearer ")){
            filterChain.doFilter(request,response);
            return;
        }
        String jwt = authHeader.substring(7);
        try {
            if (!jwtService.isAccessToken(jwt)) {
                log.debug("Bearer token rejected: Not an access token");
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }
            String username = jwtService.extractUsername(jwt);
            List<String> authorityNames = jwtService.extractAuthorities(jwt);
            List<SimpleGrantedAuthority> authorities =
                    authorityNames.stream()
                            .map(SimpleGrantedAuthority::new)
                            .toList();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            authorities
                    );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception e) {
            log.debug("JWT authentication failed: " + e.getMessage());
            SecurityContextHolder.clearContext();
        }
        filterChain.doFilter(request, response);

       
    }
}
