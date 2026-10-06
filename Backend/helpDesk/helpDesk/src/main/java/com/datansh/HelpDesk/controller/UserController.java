package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateUserRequest;
import com.datansh.HelpDesk.dto.CreateUserResponse;
import com.datansh.HelpDesk.dto.UpdateUserRequest;
import com.datansh.HelpDesk.dto.UpdateUserStatusRequest;
import com.datansh.HelpDesk.dto.UserSummaryResponse;
import com.datansh.HelpDesk.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {
    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    private final UserService userService;

    public UserController(UserService userService){
        this.userService = userService;
    }
    @PostMapping
    public ResponseEntity<CreateUserResponse> createUser(@Valid @RequestBody CreateUserRequest request){
        log.info("REST request to create user: {}", request.email());
        return ResponseEntity.ok().body(userService.createUser(request));
    }
    @GetMapping("/me")
    public ResponseEntity<CreateUserResponse> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @GetMapping("/summary")
    public ResponseEntity<UserSummaryResponse> getUserSummary() {
        return ResponseEntity.ok(userService.getUserSummary());
    }

    @GetMapping
    public ResponseEntity<Page<CreateUserResponse>> getAllUser(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isSupportStaff,
            @org.springdoc.core.annotations.ParameterObject
            @PageableDefault (size = 10,sort = "createdAt",direction = Sort.Direction.DESC)
            Pageable pageable){
        return ResponseEntity.ok().body(userService.getAllUsers(search, role, isActive, isSupportStaff, pageable));
    }
    @DeleteMapping("/{publicId}")
    public ResponseEntity<?>  deleteUser(@PathVariable UUID publicId){
        log.info("REST request to delete user: {}", publicId);
        userService.deleteUser(publicId);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/{publicId}")
    public ResponseEntity<CreateUserResponse> updateUser(@PathVariable UUID publicId , @RequestBody @Valid UpdateUserRequest request ) {
        log.info("REST request to update user: {}", publicId);
        return ResponseEntity.ok(userService.updateUser(publicId,request))  ;
    }

    @PatchMapping("/{publicId}/status")
    public ResponseEntity<CreateUserResponse> updateUserStatus(
            @PathVariable UUID publicId,
            @RequestBody @Valid UpdateUserStatusRequest request) {
        log.info("REST request to update status for user: {} to isActive={}", publicId, request.isActive());
        return ResponseEntity.ok(userService.updateUserStatus(publicId, request.isActive()));
    }
}
