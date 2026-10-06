package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateNoteRequest;
import com.datansh.HelpDesk.dto.NoteResponse;
import com.datansh.HelpDesk.service.NoteService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ticket/{ticketPublicId}/notes")
public class NoteController {
    private static final Logger log = LoggerFactory.getLogger(NoteController.class);
    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping
    public ResponseEntity<NoteResponse> addNote(
            @PathVariable UUID ticketPublicId,
            @RequestBody @Valid CreateNoteRequest request) {
        log.info("REST request to add note on ticket: {}", ticketPublicId);
        NoteResponse response = noteService.addNote(ticketPublicId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<NoteResponse>> getNotesForTicket(
            @PathVariable UUID ticketPublicId) {
        return ResponseEntity.ok(noteService.getNotesForTicket(ticketPublicId));
    }
}
