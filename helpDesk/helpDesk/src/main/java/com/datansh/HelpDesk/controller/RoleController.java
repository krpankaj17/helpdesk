package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateRoleRequest;
import com.datansh.HelpDesk.dto.RoleResponse;
import com.datansh.HelpDesk.service.RoleService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/roles")
public class RoleController {
    private  final RoleService service;
    public RoleController(RoleService service){
        this.service=service;
    }
    @GetMapping
    public ResponseEntity<Page<RoleResponse>> getAllRoles(Pageable pageable){
        return ResponseEntity.status(HttpStatus.OK).body(service.getALlRoles(pageable));
    }
    @PostMapping
    public  ResponseEntity<RoleResponse> createRole(CreateRoleRequest request){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createRole(request));

    }
}
