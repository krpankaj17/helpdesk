package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateTicketRequest;
import com.datansh.HelpDesk.dto.DashboardMetricsResponse;
import com.datansh.HelpDesk.dto.TicketActivityResponse;
import com.datansh.HelpDesk.dto.TicketResponse;
import com.datansh.HelpDesk.dto.UpdateTicketStatusRequest;
import com.datansh.HelpDesk.enums.TicketStatus;
import com.datansh.HelpDesk.service.TicketService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ticket")
public class TicketController {
    private static final Logger log = LoggerFactory.getLogger(TicketController.class);
    private final TicketService ticketService;

    public TicketController(TicketService ticketService){
        this.ticketService = ticketService;
    }

    @GetMapping
    public ResponseEntity<Page<TicketResponse>> getAllTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Long priorityId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) String agentEmail,
            @org.springdoc.core.annotations.ParameterObject Pageable pageable){
         return ResponseEntity.ok().body(ticketService.getAllTickets(search, status, priorityId, categoryId, unassigned, agentEmail, pageable));
    }

    @GetMapping("/{publicId}")
    public ResponseEntity<TicketResponse> getTicketByPublicId(@PathVariable UUID publicId){
        return ResponseEntity.ok().body(ticketService.getTicketByPublicId(publicId));
    }

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(@RequestBody @Valid CreateTicketRequest request){
        log.info("REST request to create ticket: {}", request.title());
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ticketService.createTicket(request));
    }

    @PostMapping(value = "/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<com.datansh.HelpDesk.dto.AttachmentResponse> uploadFile(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment";
        String cleanTitle = originalName.length() > 50 ? originalName.substring(0, 50) : originalName;
        String ext = "";
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = originalName.substring(dotIdx);
        }
        String uniqueName = UUID.randomUUID().toString() + ext;

        java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads");
        if (!java.nio.file.Files.exists(uploadDir)) {
            java.nio.file.Files.createDirectories(uploadDir);
        }
        java.nio.file.Path destination = uploadDir.resolve(uniqueName);
        file.transferTo(destination);

        String fileUrl = "/uploads/" + uniqueName;
        long size = file.getSize();
        String desc = originalName + " (" + (size < 1024 ? size + " B" : (size / 1024) + " KB") + ")";
        if (desc.length() > 255) desc = desc.substring(0, 255);

        return ResponseEntity.ok(new com.datansh.HelpDesk.dto.AttachmentResponse(
                null,
                cleanTitle,
                desc,
                fileUrl,
                java.time.OffsetDateTime.now()
        ));
    }

    @PatchMapping("/{publicId}/status")
    public ResponseEntity<TicketResponse> updateTicketStatus(
            @PathVariable UUID publicId,
            @RequestBody @Valid UpdateTicketStatusRequest request){
        log.info("REST request to update ticket status: {} to {}", publicId, request.status());
        return ResponseEntity.ok(ticketService.updateTicketStatus(publicId, request));
    }

    @PatchMapping("/{publicId}/category")
    public ResponseEntity<TicketResponse> updateTicketCategory(
            @PathVariable UUID publicId,
            @RequestBody @Valid com.datansh.HelpDesk.dto.UpdateTicketCategoryAssignmentRequest request){
        log.info("REST request to update ticket category: {} to categoryId {}", publicId, request.categoryId());
        return ResponseEntity.ok(ticketService.updateTicketCategory(publicId, request.categoryId()));
    }

    @GetMapping({"/{publicId}/activities", "/{publicId}/activity"})
    public ResponseEntity<List<TicketActivityResponse>> getTicketActivities(
            @PathVariable UUID publicId) {
        return ResponseEntity.ok(ticketService.getTicketActivities(publicId));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetricsResponse> getDashboardMetrics() {
        return ResponseEntity.ok(ticketService.getDashboardMetrics());
    }
}
