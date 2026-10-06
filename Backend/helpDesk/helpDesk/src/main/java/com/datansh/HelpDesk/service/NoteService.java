package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.AttachmentResponse;
import com.datansh.HelpDesk.dto.CreateAttachmentRequest;
import com.datansh.HelpDesk.dto.CreateNoteRequest;
import com.datansh.HelpDesk.dto.NoteResponse;
import com.datansh.HelpDesk.entity.Attachment;
import com.datansh.HelpDesk.entity.Note;
import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.TicketActivity;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.enums.TicketStatus;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class NoteService {
    private static final Logger log = LoggerFactory.getLogger(NoteService.class);

    private final NoteRepository noteRepository;
    private final AttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketAssignmentRepository ticketAssignmentRepository;
    private final TicketActivityRepository ticketActivityRepository;

    public NoteService(NoteRepository noteRepository,
                       AttachmentRepository attachmentRepository,
                       TicketRepository ticketRepository,
                       UserRepository userRepository,
                       TicketAssignmentRepository ticketAssignmentRepository,
                       TicketActivityRepository ticketActivityRepository) {
        this.noteRepository = noteRepository;
        this.attachmentRepository = attachmentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.ticketAssignmentRepository = ticketAssignmentRepository;
        this.ticketActivityRepository = ticketActivityRepository;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));
    }

    private boolean canAccessNotes(Ticket ticket, User currentUser) {
        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";

        if ("ADMIN".equals(role) || "SUPPORT_MANAGER".equals(role)) {
            return true;
        }

        if ("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) {
            return ticketAssignmentRepository.existsByTicketIdAndAssignedToAndIsActive(ticket, currentUser, true);
        }

        return false;
    }

    @Transactional
    public NoteResponse addNote(UUID ticketPublicId, CreateNoteRequest request) {
        User currentUser = getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessNotes(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to access internal notes");
        }

        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";
        if (TicketStatus.CLOSED.equals(ticket.getStatus()) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Closed tickets cannot be edited except by an Admin");
        }

        Note note = Note.builder()
                .ticketId(ticket)
                .userId(currentUser)
                .description(request.description().trim())
                .build();
        Note savedNote = noteRepository.save(note);

        List<AttachmentResponse> attachmentResponses = new ArrayList<>();
        if (request.attachments() != null && !request.attachments().isEmpty()) {
            for (CreateAttachmentRequest attReq : request.attachments()) {
                Attachment attachment = Attachment.builder()
                        .title(attReq.title().trim())
                        .description(attReq.description() != null ? attReq.description().trim() : null)
                        .url(attReq.url().trim())
                        .ticketId(ticket)
                        .noteId(savedNote)
                        .build();
                Attachment savedAtt = attachmentRepository.save(attachment);
                attachmentResponses.add(mapToAttachmentResponse(savedAtt));
            }
        }

        ticketActivityRepository.save(TicketActivity.builder()
                .ticketId(ticket)
                .userId(currentUser)
                .description("Internal note added by " + currentUser.getName())
                .build());

        log.info("Internal note added to ticket " + ticketPublicId + " by " + currentUser.getEmail());

        return mapToNoteResponse(savedNote, attachmentResponses);
    }

    public List<NoteResponse> getNotesForTicket(UUID ticketPublicId) {
        User currentUser = getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessNotes(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to access internal notes");
        }

        List<Note> notes = noteRepository.findByTicketIdOrderByCreatedAtAsc(ticket);
        if (notes.isEmpty()) {
            return Collections.emptyList();
        }

        List<Attachment> attachments = attachmentRepository.findByNoteIdIn(notes);
        Map<Long, List<AttachmentResponse>> attachmentsByNoteId = attachments.stream()
                .filter(a -> a.getNoteId() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getNoteId().getNoteId(),
                        Collectors.mapping(this::mapToAttachmentResponse, Collectors.toList())
                ));

        return notes.stream()
                .map(n -> mapToNoteResponse(n, attachmentsByNoteId.getOrDefault(n.getNoteId(), Collections.emptyList())))
                .toList();
    }

    private NoteResponse mapToNoteResponse(Note note, List<AttachmentResponse> attachments) {
        return new NoteResponse(
                note.getNoteId(),
                note.getTicketId() != null ? note.getTicketId().getTicketPublicId() : null,
                note.getUserId() != null ? note.getUserId().getUserPublicId() : null,
                note.getUserId() != null ? note.getUserId().getName() : null,
                note.getUserId() != null && note.getUserId().getRole() != null ? note.getUserId().getRole().getName() : null,
                note.getDescription(),
                attachments,
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }

    private AttachmentResponse mapToAttachmentResponse(Attachment a) {
        return new AttachmentResponse(
                a.getAttachmentId(),
                a.getTitle(),
                a.getDescription(),
                a.getUrl(),
                a.getCreatedAt()
        );
    }
}
