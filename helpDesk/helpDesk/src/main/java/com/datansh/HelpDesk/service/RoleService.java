package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateRoleRequest;
import com.datansh.HelpDesk.dto.RoleResponse;
import com.datansh.HelpDesk.entity.Role;
import com.datansh.HelpDesk.repository.RoleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class RoleService {
    private  final RoleRepository repository;
    public RoleService(RoleRepository repository){
        this.repository = repository;
    }
    public Page<RoleResponse> getALlRoles(Pageable pageable){
       return repository.findAll(pageable).map(this::mapToResponse);
    }

    public RoleResponse createRole(CreateRoleRequest request){
        Role role = Role.builder()
                .name(request.name())
                .description(request.description()).build();
        Role savedRole = repository.save(role);
        return mapToResponse(savedRole);
    }
    public RoleResponse mapToResponse(Role role){
        return new RoleResponse(role.getRoleId(),
               role.getName(),
                role.getDescription());
    }
}
