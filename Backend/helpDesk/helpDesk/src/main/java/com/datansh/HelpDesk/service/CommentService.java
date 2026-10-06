package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.AttachmentResponse;
import com.datansh.HelpDesk.dto.CommentResponse;
import com.datansh.HelpDesk.dto.CreateAttachmentRequest;
import com.datansh.HelpDesk.dto.CreateCommentRequest;
import com.datansh.HelpDesk.entity.Attachment;
import com.datansh.HelpDesk.entity.Comment;
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
public class CommentService {
    private static final Logger log = LoggerFactory.getLogger(CommentService.class);

    private final CommentRepository commentRepository;
    private final AttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketAssignmentRepository ticketAssignmentRepository;
    private final TicketActivityRepository ticketActivityRepository;
    private final NotificationService notificationService;

    public CommentService(CommentRepository commentRepository,
                          AttachmentRepository attachmentRepository,
                          TicketRepository ticketRepository,
                          UserRepository userRepository,
                          TicketAssignmentRepository ticketAssignmentRepository,
                          TicketActivityRepository ticketActivityRepository,
                          NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.attachmentRepository = attachmentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.ticketAssignmentRepository = ticketAssignmentRepository;
        this.ticketActivityRepository = ticketActivityRepository;
        this.notificationService = notificationService;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));
    }

    private boolean canAccessComments(Ticket ticket, User currentUser) {
        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";

        if ("ADMIN".equals(role) || "SUPPORT_MANAGER".equals(role)) {
            return true;
        }

        if ("REQUESTER".equals(role)) {
            return ticket.getRequestor() != null && ticket.getRequestor().getUserId().equals(currentUser.getUserId());
        }

        if ("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) {
            return ticketAssignmentRepository.existsByTicketIdAndAssignedToAndIsActive(ticket, currentUser, true);
        }

        return false;
    }

    @Transactional
    public CommentResponse addComment(UUID ticketPublicId, CreateCommentRequest request) {
        User currentUser = getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessComments(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to view or add comments for this ticket");
        }

        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";
        if (TicketStatus.CLOSED.equals(ticket.getStatus()) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Closed tickets cannot be edited except by an Admin");
        }

        Comment comment = Comment.builder()
                .ticketId(ticket)
                .userId(currentUser)
                .description(request.description().trim())
                .build();
        Comment savedComment = commentRepository.save(comment);

        List<AttachmentResponse> attachmentResponses = new ArrayList<>();
        if (request.attachments() != null && !request.attachments().isEmpty()) {
            for (CreateAttachmentRequest attReq : request.attachments()) {
                Attachment attachment = Attachment.builder()
                        .title(attReq.title().trim())
                        .description(attReq.description() != null ? attReq.description().trim() : null)
                        .url(attReq.url().trim())
                        .ticketId(ticket)
                        .commentId(savedComment)
                        .build();
                Attachment savedAtt = attachmentRepository.save(attachment);
                attachmentResponses.add(mapToAttachmentResponse(savedAtt));
            }
        }

        if (TicketStatus.WAITING_ON_REQUESTOR.equals(ticket.getStatus()) && "REQUESTER".equals(role)) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
            ticketRepository.save(ticket);
            ticketActivityRepository.save(TicketActivity.builder()
                    .ticketId(ticket)
                    .userId(currentUser)
                    .description("Requester replied: status automatically updated to IN_PROGRESS")
                    .build());
        }

        ticketActivityRepository.save(TicketActivity.builder()
                .ticketId(ticket)
                .userId(currentUser)
                .description("Comment added by " + currentUser.getName())
                .build());

        if (ticket.getRequestor() != null && !ticket.getRequestor().getUserId().equals(currentUser.getUserId())) {
            notificationService.createNotification(
                    ticket.getRequestor(),
                    ticket,
                    "New Comment on Ticket",
                    currentUser.getName() + " commented on ticket #" + ticket.getTicketId() + " (" + ticket.getTitle() + ")",
                    "COMMENT"
            );
        }

        if ("REQUESTER".equals(role)) {
            ticketAssignmentRepository.findFirstByTicketIdAndIsActiveTrueOrderByAssignmentIdDesc(ticket).ifPresent(assignment -> {
                if (assignment.getAssignedTo() != null) {
                    notificationService.createNotification(
                            assignment.getAssignedTo(),
                            ticket,
                            "Requester Replied",
                            currentUser.getName() + " replied on ticket #" + ticket.getTicketId() + " (" + ticket.getTitle() + ")",
                            "COMMENT"
                    );
                }
            });
        }

        log.info("Comment added to ticket " + ticketPublicId + " by " + currentUser.getEmail());

        return mapToCommentResponse(savedComment, attachmentResponses);
    }

    public List<CommentResponse> getCommentsForTicket(UUID ticketPublicId) {
        User currentUser = getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessComments(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to view or add comments for this ticket");
        }

        List<Comment> comments = commentRepository.findByTicketIdOrderByCreatedAtAsc(ticket);
        if (comments.isEmpty()) {
            return Collections.emptyList();
        }

        List<Attachment> attachments = attachmentRepository.findByCommentIdIn(comments);
        Map<Long, List<AttachmentResponse>> attachmentsByCommentId = attachments.stream()
                .filter(a -> a.getCommentId() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getCommentId().getCommentId(),
                        Collectors.mapping(this::mapToAttachmentResponse, Collectors.toList())
                ));

        return comments.stream()
                .map(c -> mapToCommentResponse(c, attachmentsByCommentId.getOrDefault(c.getCommentId(), Collections.emptyList())))
                .toList();
    }

    private CommentResponse mapToCommentResponse(Comment comment, List<AttachmentResponse> attachments) {
        return new CommentResponse(
                comment.getCommentId(),
                comment.getTicketId() != null ? comment.getTicketId().getTicketPublicId() : null,
                comment.getUserId() != null ? comment.getUserId().getUserPublicId() : null,
                comment.getUserId() != null ? comment.getUserId().getName() : null,
                comment.getUserId() != null && comment.getUserId().getRole() != null ? comment.getUserId().getRole().getName() : null,
                comment.getDescription(),
                attachments,
                comment.getCreatedAt()
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
