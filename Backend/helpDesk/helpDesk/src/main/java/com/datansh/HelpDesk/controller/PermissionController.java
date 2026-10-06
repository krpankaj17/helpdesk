package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreatePermissionRequest;
import com.datansh.HelpDesk.dto.PermissionResponse;
import com.datansh.HelpDesk.dto.UpdatePermissionRequest;
import com.datansh.HelpDesk.service.PermissionService;
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
@RequestMapping({"/permissions", "/permission"})
public class PermissionController {
    private static final Logger log = LoggerFactory.getLogger(PermissionController.class);
    private final PermissionService service;

    public PermissionController(PermissionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<PermissionResponse>> getAllPermissions(
            @org.springdoc.core.annotations.ParameterObject
            @PageableDefault(size = 10, sort = "permissionId", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.status(HttpStatus.OK).body(service.getAllPermission(pageable));
    }

    @GetMapping("/all")
    public ResponseEntity<List<PermissionResponse>> getAllPermissionsList() {
        return ResponseEntity.status(HttpStatus.OK).body(service.getAllPermissionsList());
    }

    @PostMapping
    public ResponseEntity<PermissionResponse> createPermission(@RequestBody @Valid CreatePermissionRequest request) {
        log.info("REST request to create permission: {}", request.name());
        return ResponseEntity.status(HttpStatus.OK).body(service.createPermission(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PermissionResponse> updatePermission(@RequestBody @Valid UpdatePermissionRequest request, @PathVariable Long id) {
        log.info("REST request to update permission: #{}", id);
        return ResponseEntity.status(HttpStatus.OK).body(service.updatePermission(request, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePermission(@PathVariable Long id) {
        log.info("REST request to delete permission: #{}", id);
        service.deletePermission(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
