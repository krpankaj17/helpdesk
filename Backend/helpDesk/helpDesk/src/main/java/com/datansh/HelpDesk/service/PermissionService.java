package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreatePermissionRequest;
import com.datansh.HelpDesk.dto.PermissionResponse;
import com.datansh.HelpDesk.dto.UpdatePermissionRequest;
import com.datansh.HelpDesk.entity.Permission;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.PermissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class PermissionService {
    private static final Logger log = LoggerFactory.getLogger(PermissionService.class);
    private final PermissionRepository repository;

    public PermissionService(PermissionRepository repository){
        this.repository = repository;
    }
    public Page<PermissionResponse> getAllPermission(Pageable pageable){
         return repository.findAll(pageable).map(this::mapToResponse);
    }

    public java.util.List<PermissionResponse> getAllPermissionsList() {
        return repository.findAll().stream().map(this::mapToResponse).toList();
    }

    public PermissionResponse createPermission(CreatePermissionRequest request){
        Permission permission = Permission.builder()
                .name(request.name())
                .description(request.description())
                .build();
        Permission savedPermission = repository.save(permission);
        log.info("Permission created: " + savedPermission.getName() + " with id: " + savedPermission.getPermissionId());
        return mapToResponse(savedPermission);
    }

    public void deletePermission(Long id){
        Permission permission = repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Permission", "id", id));
        repository.delete(permission);
        log.info("Permission deleted with id: " + id);
    }
    public PermissionResponse updatePermission(UpdatePermissionRequest request, Long id){
        Permission permission = repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Permission", "id", id));
        if (request.name() !=null){
             permission.setName(request.name());
        }
        if (request.description()!=null){
            permission.setDescription(request.description());
        }
       Permission savedPermission =  repository.save(permission);
       log.info("Permission updated: " + savedPermission.getName() + " with id: " + id);
        return mapToResponse(savedPermission);
    }

    private PermissionResponse mapToResponse(Permission permission){
        return new PermissionResponse(permission.getPermissionId(),
                permission.getName(),
                permission.getDescription());
    }
}
