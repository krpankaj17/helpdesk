package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreatePriorityRequest;
import com.datansh.HelpDesk.dto.PriorityResponse;
import com.datansh.HelpDesk.service.PriorityService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/priority")
public class PriorityController {
    private final PriorityService priorityService;
    public PriorityController(PriorityService priorityService){
        this.priorityService = priorityService;
    }
    public ResponseEntity<Page<PriorityResponse>> getAllPriorties(Pageable pageable){
        return ResponseEntity.ok().body(priorityService.getAllPriority(pageable));
    }
    public ResponseEntity<PriorityResponse> createPriority(@RequestBody @Valid CreatePriorityRequest request){
        return ResponseEntity.status(HttpStatus.CREATED).body(priorityService.createPriority(request));
    }
}
