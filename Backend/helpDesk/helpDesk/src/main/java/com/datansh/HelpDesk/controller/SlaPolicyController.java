package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateSlaPolicyRequest;
import com.datansh.HelpDesk.dto.SlaPolicyResponse;
import com.datansh.HelpDesk.dto.UpdateSlaPolicyRequest;
import com.datansh.HelpDesk.service.SlaPolicyService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sla-policies")
public class SlaPolicyController {
    private static final Logger log = LoggerFactory.getLogger(SlaPolicyController.class);
    private final SlaPolicyService slaPolicyService;

    public SlaPolicyController(SlaPolicyService slaPolicyService) {
        this.slaPolicyService = slaPolicyService;
    }

    @GetMapping
    public ResponseEntity<List<SlaPolicyResponse>> getAllPolicies() {
        return ResponseEntity.ok(slaPolicyService.getAllPolicies());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SlaPolicyResponse> getPolicyById(@PathVariable Long id) {
        return ResponseEntity.ok(slaPolicyService.getPolicyById(id));
    }

    @GetMapping("/priority/{priorityId}")
    public ResponseEntity<SlaPolicyResponse> getPolicyByPriorityId(@PathVariable Long priorityId) {
        return ResponseEntity.ok(slaPolicyService.getPolicyByPriorityId(priorityId));
    }

    @PostMapping
    public ResponseEntity<SlaPolicyResponse> createPolicy(@RequestBody @Valid CreateSlaPolicyRequest request) {
        log.info("REST request to create SLA policy for priority: {}", request.priorityId());
        return ResponseEntity.status(HttpStatus.CREATED).body(slaPolicyService.createPolicy(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SlaPolicyResponse> updatePolicy(
            @PathVariable Long id,
            @RequestBody @Valid UpdateSlaPolicyRequest request) {
        log.info("REST request to update SLA policy: #{}", id);
        return ResponseEntity.ok(slaPolicyService.updatePolicy(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePolicy(@PathVariable Long id) {
        log.info("REST request to delete SLA policy: #{}", id);
        slaPolicyService.deletePolicy(id);
        return ResponseEntity.noContent().build();
    }
}
