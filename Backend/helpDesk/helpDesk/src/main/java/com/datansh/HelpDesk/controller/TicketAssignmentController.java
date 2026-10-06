package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.AssignTicketRequest;
import com.datansh.HelpDesk.dto.TicketAssignmentResponse;
import com.datansh.HelpDesk.dto.UpdateAssignmentRequest;
import com.datansh.HelpDesk.service.TicketAssignmentService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ticket/{ticketPublicId}")
public class TicketAssignmentController {
    private static final Logger log = LoggerFactory.getLogger(TicketAssignmentController.class);
    private final TicketAssignmentService ticketAssignmentService;

    public TicketAssignmentController(TicketAssignmentService ticketAssignmentService) {
        this.ticketAssignmentService = ticketAssignmentService;
    }

    @PostMapping({"/assign", "/assignments"})
    public ResponseEntity<TicketAssignmentResponse> assignTicket(
            @PathVariable UUID ticketPublicId,
            @RequestBody @Valid AssignTicketRequest request) {
        log.info("REST request to assign ticket: {} to agent: {}", ticketPublicId, request.agentEmail());
        TicketAssignmentResponse response = ticketAssignmentService.assignTicket(ticketPublicId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<TicketAssignmentResponse>> getAssignmentsForTicket(
            @PathVariable UUID ticketPublicId) {
        List<TicketAssignmentResponse> response = ticketAssignmentService.getAssignmentsForTicket(ticketPublicId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/assignments/{assignmentId}")
    public ResponseEntity<TicketAssignmentResponse> getAssignmentById(
            @PathVariable UUID ticketPublicId,
            @PathVariable Long assignmentId) {
        TicketAssignmentResponse response = ticketAssignmentService.getAssignmentById(ticketPublicId, assignmentId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/assignments/{assignmentId}")
    public ResponseEntity<TicketAssignmentResponse> updateAssignment(
            @PathVariable UUID ticketPublicId,
            @PathVariable Long assignmentId,
            @RequestBody UpdateAssignmentRequest request) {
        log.info("REST request to update assignment: #{} for ticket: {}", assignmentId, ticketPublicId);
        TicketAssignmentResponse response = ticketAssignmentService.updateAssignment(ticketPublicId, assignmentId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public ResponseEntity<Void> deleteAssignment(
            @PathVariable UUID ticketPublicId,
            @PathVariable Long assignmentId) {
        log.info("REST request to delete assignment: #{} for ticket: {}", assignmentId, ticketPublicId);
        ticketAssignmentService.deleteAssignment(ticketPublicId, assignmentId);
        return ResponseEntity.noContent().build();
    }
}
