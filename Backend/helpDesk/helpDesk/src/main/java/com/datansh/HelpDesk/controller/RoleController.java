package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.AssignRolePermissionsRequest;
import com.datansh.HelpDesk.dto.CreateRoleRequest;
import com.datansh.HelpDesk.dto.PermissionResponse;
import com.datansh.HelpDesk.dto.RoleResponse;
import com.datansh.HelpDesk.service.RoleService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/roles")
public class RoleController {
    private static final Logger log = LoggerFactory.getLogger(RoleController.class);
    private final RoleService service;

    public RoleController(RoleService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<RoleResponse>> getAllRoles(
            @org.springdoc.core.annotations.ParameterObject
            @PageableDefault(size = 10, sort = "roleId", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.status(HttpStatus.OK).body(service.getALlRoles(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> getRoleById(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.OK).body(service.getRoleById(id));
    }

    @GetMapping("/{id}/permissions")
    public ResponseEntity<List<PermissionResponse>> getRolePermissions(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.OK).body(service.getPermissionsForRole(id));
    }

    @PostMapping
    public ResponseEntity<RoleResponse> createRole(@RequestBody @Valid CreateRoleRequest request) {
        log.info("REST request to create role: {}", request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createRole(request));
    }

    @PutMapping("/{id}/permissions")
    public ResponseEntity<RoleResponse> assignPermissionsToRole(
            @PathVariable Long id,
            @RequestBody @Valid AssignRolePermissionsRequest request) {
        log.info("REST request to assign permissions to role: #{}", id);
        return ResponseEntity.status(HttpStatus.OK).body(service.assignPermissionsToRole(id, request.permissionIds()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> updateRole(
            @PathVariable Long id,
            @RequestBody @Valid CreateRoleRequest request) {
        log.info("REST request to update role: #{}", id);
        return ResponseEntity.status(HttpStatus.OK).body(service.updateRole(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        log.info("REST request to delete role: #{}", id);
        service.deleteRole(id);
        return ResponseEntity.noContent().build();
    }
}
