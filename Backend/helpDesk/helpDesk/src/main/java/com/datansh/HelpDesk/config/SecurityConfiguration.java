package com.datansh.HelpDesk.config;

import com.datansh.HelpDesk.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfiguration {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfiguration(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/login", "/refresh-token", "/refresh").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .requestMatchers("/users/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/users/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/users/**").authenticated()
                        .requestMatchers("/users/**").hasAuthority("USER_MANAGE")
                        .requestMatchers("/roles/**").hasAuthority("USER_MANAGE")
                        .requestMatchers("/permission/**", "/permissions/**").hasAuthority("USER_MANAGE")
                        .requestMatchers(HttpMethod.GET, "/category/**").authenticated()
                        .requestMatchers("/category/**").hasAuthority("CATEGORY_MANAGE")
                        .requestMatchers(HttpMethod.GET, "/priority/**").authenticated()
                        .requestMatchers("/priority/**").hasAuthority("PRIORITY_MANAGE")
                        .requestMatchers(HttpMethod.GET, "/sla-policies/**").authenticated()
                        .requestMatchers("/sla-policies/**").hasAuthority("PRIORITY_MANAGE")
                        .requestMatchers("/ticket/**").authenticated()
                        .requestMatchers("/notifications/**").authenticated()
                        .anyRequest().authenticated());
        return http.build();
    }

    @org.springframework.beans.factory.annotation.Value("${cors.allowed-origins:http://localhost:*,http://127.0.0.1:*,https://*}")
    private String corsAllowedOrigins;

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        java.util.List<String> origins = java.util.Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setAllowCredentials(true);
        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}

