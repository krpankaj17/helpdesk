package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreatePriorityRequest;
import com.datansh.HelpDesk.dto.PriorityResponse;
import com.datansh.HelpDesk.dto.UpdatePriorityRequest;
import com.datansh.HelpDesk.service.PriorityService;
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

@RestController
@RequestMapping("/priority")
public class PriorityController {
    private static final Logger log = LoggerFactory.getLogger(PriorityController.class);
    private final PriorityService priorityService;

    public PriorityController(PriorityService priorityService){
        this.priorityService = priorityService;
    }
    @GetMapping
    public ResponseEntity<Page<PriorityResponse>> getAllPriorties(
            @org.springdoc.core.annotations.ParameterObject
            @PageableDefault(size = 10, sort = "priorityId", direction = Sort.Direction.ASC) Pageable pageable){
        return ResponseEntity.ok().body(priorityService.getAllPriority(pageable));
    }
    @PostMapping
    public ResponseEntity<PriorityResponse> createPriority(@RequestBody @Valid CreatePriorityRequest request){
        log.info("REST request to create priority: {}", request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(priorityService.createPriority(request));
    }
    @PutMapping("/{id}")
    public ResponseEntity<PriorityResponse> updatePriority(@RequestBody @Valid UpdatePriorityRequest request,@PathVariable Long id){
        log.info("REST request to update priority: #{}", id);
        return ResponseEntity.status(HttpStatus.OK).body(priorityService.updatePriority(request,id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PriorityResponse> getPriorityById(@PathVariable Long id){
        return ResponseEntity.ok(priorityService.getPriorityById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePriority(@PathVariable Long id){
        log.info("REST request to delete priority: #{}", id);
        priorityService.deletePriority(id);
        return ResponseEntity.noContent().build();
    }
}
