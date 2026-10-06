package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CommentResponse;
import com.datansh.HelpDesk.dto.CreateCommentRequest;
import com.datansh.HelpDesk.service.CommentService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ticket/{ticketPublicId}/comments")
public class CommentController {
    private static final Logger log = LoggerFactory.getLogger(CommentController.class);
    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID ticketPublicId,
            @RequestBody @Valid CreateCommentRequest request) {
        log.info("REST request to add comment on ticket: {}", ticketPublicId);
        CommentResponse response = commentService.addComment(ticketPublicId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<CommentResponse>> getCommentsForTicket(
            @PathVariable UUID ticketPublicId) {
        return ResponseEntity.ok(commentService.getCommentsForTicket(ticketPublicId));
    }
}
