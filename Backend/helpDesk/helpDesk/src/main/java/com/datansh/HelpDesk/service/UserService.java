package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateUserRequest;
import com.datansh.HelpDesk.dto.CreateUserResponse;
import com.datansh.HelpDesk.dto.UpdateUserRequest;
import com.datansh.HelpDesk.entity.Role;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.RoleRepository;
import com.datansh.HelpDesk.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public CreateUserResponse createUser(CreateUserRequest request) {
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", request.roleId()));
        String hashPassword = passwordEncoder.encode(request.password());
        User userReq = User.builder()
                .email(request.email() != null ? request.email().trim().toLowerCase() : null)
                .name(request.name())
                .password(hashPassword)
                .role(role)
                .isActive(true)
                .build();
        User savedUser = userRepository.save(userReq);
        log.info("User created successfully: " + savedUser.getEmail() + " with role: " + role.getName());

        return mapToResponse(savedUser);
    }

    public Page<CreateUserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToResponse);
    }

    public void deleteUser(UUID userPublicId) {
        User user = userRepository.findByUserPublicId(userPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "publicId", userPublicId));
        user.setIsActive(false);
        userRepository.save(user);
        log.info("User deactivated (soft-deleted): " + userPublicId);
    }

    public CreateUserResponse updateUserStatus(UUID userPublicId, Boolean isActive) {
        User user = userRepository.findByUserPublicId(userPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "publicId", userPublicId));
        user.setIsActive(isActive);
        User savedUser = userRepository.save(user);
        log.info("User " + userPublicId + " status updated to isActive=" + isActive);
        return mapToResponse(savedUser);
    }

    public CreateUserResponse updateUser(UUID userPublicId, UpdateUserRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        User caller = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        User user = userRepository.findByUserPublicId(userPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "publicId", userPublicId));

        String callerRole = caller.getRole() != null ? caller.getRole().getName() : "";
        boolean isAdmin = "ADMIN".equals(callerRole);
        boolean isSelf = caller.getUserPublicId().equals(userPublicId);

        if (!isAdmin && !isSelf) {
            throw new AccessDeniedException("You do not have permission to update this profile");
        }

        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().trim());
        }
        if (request.email() != null && !request.email().isBlank()) {
            String newEmail = request.email().trim().toLowerCase();
            java.util.Optional<User> existing = userRepository.findByEmail(newEmail);
            if (existing.isPresent() && !existing.get().getUserPublicId().equals(userPublicId)) {
                throw new IllegalArgumentException("Email is already in use by another account");
            }
            user.setEmail(newEmail);
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        // Only ADMIN can modify user roles!
        if (request.roleId() != null) {
            if (!isAdmin) {
                throw new AccessDeniedException("Only administrators can modify roles");
            }
            Role role = roleRepository.findById(request.roleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Role", "id", request.roleId()));
            user.setRole(role);
        }

        User savedUser = userRepository.save(user);
        log.info("User " + userPublicId + " profile updated successfully by " + caller.getEmail());
        return mapToResponse(savedUser);
    }

    public CreateUserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        return mapToResponse(user);
    }

    private CreateUserResponse mapToResponse(User user) {
        String roleName = user.getRole() != null ? user.getRole().getName() : null;
        return new CreateUserResponse(
                user.getUserPublicId(),
                user.getName(),
                user.getEmail(),
                user.getIsActive(),
                roleName
        );
    }
}
