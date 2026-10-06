package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateRoleRequest;
import com.datansh.HelpDesk.dto.PermissionResponse;
import com.datansh.HelpDesk.dto.RoleResponse;
import com.datansh.HelpDesk.entity.Permission;
import com.datansh.HelpDesk.entity.Role;
import com.datansh.HelpDesk.entity.RolePermissionId;
import com.datansh.HelpDesk.entity.RolePermissionJunction;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.PermissionRepository;
import com.datansh.HelpDesk.repository.RolePermissionJunctionRepository;
import com.datansh.HelpDesk.repository.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoleService {
    private static final Logger log = LoggerFactory.getLogger(RoleService.class);
    private final RoleRepository repository;
    private final RolePermissionJunctionRepository rolePermissionJunctionRepository;
    private final PermissionRepository permissionRepository;
    private final com.datansh.HelpDesk.repository.UserRepository userRepository;

    public RoleService(RoleRepository repository,
                       RolePermissionJunctionRepository rolePermissionJunctionRepository,
                       PermissionRepository permissionRepository,
                       com.datansh.HelpDesk.repository.UserRepository userRepository) {
        this.repository = repository;
        this.rolePermissionJunctionRepository = rolePermissionJunctionRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
    }

    public Page<RoleResponse> getALlRoles(Pageable pageable) {
        return repository.findAll(pageable).map(this::mapToResponseWithPermissions);
    }

    public RoleResponse getRoleById(Long roleId) {
        Role role = repository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));
        return mapToResponseWithPermissions(role);
    }

    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        Role role = Role.builder()
                .name(request.name())
                .description(request.description())
                .build();
        Role savedRole = repository.save(role);
        if (request.permissionIds() != null && !request.permissionIds().isEmpty()) {
            assignPermissionsInternal(savedRole, request.permissionIds());
        }
        log.info("Role created: " + savedRole.getName() + " with id: " + savedRole.getRoleId());
        return mapToResponseWithPermissions(savedRole);
    }

    @Transactional
    public RoleResponse updateRole(Long roleId, CreateRoleRequest request) {
        Role role = repository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));
        if (request.name() != null && !request.name().isBlank()) {
            role.setName(request.name().trim());
        }
        if (request.description() != null) {
            role.setDescription(request.description().trim());
        }
        Role savedRole = repository.save(role);
        if (request.permissionIds() != null) {
            assignPermissionsToRole(roleId, request.permissionIds());
        }
        log.info("Role updated: {} with id: {}", savedRole.getName(), savedRole.getRoleId());
        return mapToResponseWithPermissions(savedRole);
    }

    @Transactional
    public void deleteRole(Long roleId) {
        Role role = repository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));
        if (userRepository.existsByRole_RoleId(roleId)) {
            throw new IllegalArgumentException("Cannot delete role '" + role.getName() + "' because users are currently assigned to it.");
        }
        rolePermissionJunctionRepository.deleteByRoleId(roleId);
        repository.delete(role);
        log.info("Role deleted with id: {}", roleId);
    }

    @Transactional
    public RoleResponse assignPermissionsToRole(Long roleId, List<Long> permissionIds) {
        Role role = repository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));
        rolePermissionJunctionRepository.deleteByRoleId(roleId);
        if (permissionIds != null && !permissionIds.isEmpty()) {
            assignPermissionsInternal(role, permissionIds);
        }
        log.info("Assigned " + (permissionIds != null ? permissionIds.size() : 0) + " permissions to role: " + role.getName());
        return mapToResponseWithPermissions(role);
    }

    public List<PermissionResponse> getPermissionsForRole(Long roleId) {
        if (!repository.existsById(roleId)) {
            throw new ResourceNotFoundException("Role", "id", roleId);
        }
        return rolePermissionJunctionRepository.findPermissionsByRoleId(roleId).stream()
                .map(junction -> new PermissionResponse(
                        junction.getPermission().getPermissionId(),
                        junction.getPermission().getName(),
                        junction.getPermission().getDescription()
                ))
                .toList();
    }

    private void assignPermissionsInternal(Role role, List<Long> permissionIds) {
        List<Permission> permissions = permissionRepository.findAllById(permissionIds);
        List<RolePermissionJunction> junctions = new ArrayList<>();
        for (Permission permission : permissions) {
            RolePermissionId id = new RolePermissionId(role.getRoleId(), permission.getPermissionId());
            RolePermissionJunction junction = RolePermissionJunction.builder()
                    .rolePermissionId(id)
                    .role(role)
                    .permission(permission)
                    .build();
            junctions.add(junction);
        }
        rolePermissionJunctionRepository.saveAll(junctions);
    }

    public RoleResponse mapToResponse(Role role) {
        return mapToResponseWithPermissions(role);
    }

    private RoleResponse mapToResponseWithPermissions(Role role) {
        List<PermissionResponse> permissions = rolePermissionJunctionRepository
                .findPermissionsByRoleId(role.getRoleId()).stream()
                .map(junction -> new PermissionResponse(
                        junction.getPermission().getPermissionId(),
                        junction.getPermission().getName(),
                        junction.getPermission().getDescription()
                ))
                .toList();
        return new RoleResponse(role.getRoleId(), role.getName(), role.getDescription(), permissions);
    }
}
