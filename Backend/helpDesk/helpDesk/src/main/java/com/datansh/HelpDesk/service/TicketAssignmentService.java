package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.AssignTicketRequest;
import com.datansh.HelpDesk.dto.TicketAssignmentResponse;
import com.datansh.HelpDesk.dto.UpdateAssignmentRequest;
import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.TicketActivity;
import com.datansh.HelpDesk.entity.TicketAssignment;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.enums.TicketStatus;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.TicketActivityRepository;
import com.datansh.HelpDesk.repository.TicketAssignmentRepository;
import com.datansh.HelpDesk.repository.TicketRepository;
import com.datansh.HelpDesk.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class TicketAssignmentService {
    private static final Logger log = LoggerFactory.getLogger(TicketAssignmentService.class);

    private final TicketAssignmentRepository ticketAssignmentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketActivityRepository ticketActivityRepository;
    private final NotificationService notificationService;

    public TicketAssignmentService(TicketAssignmentRepository ticketAssignmentRepository,
                                  TicketRepository ticketRepository,
                                  UserRepository userRepository,
                                  TicketActivityRepository ticketActivityRepository,
                                  NotificationService notificationService) {
        this.ticketAssignmentRepository = ticketAssignmentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
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

    private void validateManagerOrAdmin(User currentUser) {
        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";
        if (!"ADMIN".equals(role) && !"SUPPORT_MANAGER".equals(role)) {
            throw new AccessDeniedException("Only Admins and Support Managers can manage ticket assignments");
        }
    }

    private boolean canAccessTicket(Ticket ticket, User currentUser) {
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

    private User resolveUser(UUID publicId, String email, String name, String fieldPrefix) {
        if (publicId != null) {
            return userRepository.findByUserPublicId(publicId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "publicId", publicId));
        }
        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email.trim().toLowerCase())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", email.trim()));
        }
        if (name != null && !name.isBlank()) {
            return userRepository.findFirstByName(name.trim())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "name", name.trim()));
        }
        return null;
    }

    @Transactional
    public TicketAssignmentResponse assignTicket(UUID ticketPublicId, AssignTicketRequest request) {
        User currentUser = getCurrentUser();
        validateManagerOrAdmin(currentUser);

        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        User agent = resolveUser(request.agentPublicId(), request.agentEmail(), request.agentName(), "agent");
        if (agent == null) {
            throw new IllegalArgumentException("Agent identifier must be provided (agentPublicId, agentEmail, or agentName)");
        }

        if (!Boolean.TRUE.equals(agent.getIsActive())) {
            throw new IllegalArgumentException("Cannot assign ticket to an inactive user");
        }

        List<TicketAssignment> activeAssignments = ticketAssignmentRepository.findByTicketIdOrderByCreatedAtDesc(ticket);
        for (TicketAssignment existing : activeAssignments) {
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                existing.setIsActive(false);
                ticketAssignmentRepository.save(existing);
            }
        }

        TicketAssignment assignment = TicketAssignment.builder()
                .ticketId(ticket)
                .assignedTo(agent)
                .assignedBy(currentUser)
                .isActive(true)
                .assignedAt(OffsetDateTime.now())
                .build();

        TicketAssignment savedAssignment = ticketAssignmentRepository.save(assignment);

        if (TicketStatus.OPEN.equals(ticket.getStatus())) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
            ticketRepository.save(ticket);
        }

        ticketActivityRepository.save(TicketActivity.builder()
                .ticketId(ticket)
                .userId(currentUser)
                .description("Ticket assigned to " + agent.getName() + " by " + currentUser.getName())
                .build());

        notificationService.createNotification(
                agent,
                ticket,
                "Ticket Assigned",
                "Ticket #" + ticket.getTicketId() + " (" + ticket.getTitle() + ") has been assigned to you by " + currentUser.getName(),
                "ASSIGNMENT"
        );

        log.info("Ticket " + ticketPublicId + " assigned to agent " + agent.getEmail() + " by " + currentUser.getEmail());

        return mapToResponse(savedAssignment);
    }

    public List<TicketAssignmentResponse> getAssignmentsForTicket(UUID ticketPublicId) {
        User currentUser = getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessTicket(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to view assignments for this ticket");
        }

        return ticketAssignmentRepository.findByTicketIdOrderByCreatedAtDesc(ticket)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public TicketAssignmentResponse getAssignmentById(UUID ticketPublicId, Long assignmentId) {
        User currentUser = getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessTicket(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to view assignments for this ticket");
        }

        TicketAssignment assignment = ticketAssignmentRepository.findByAssignmentIdAndTicketId(assignmentId, ticket)
                .orElseThrow(() -> new ResourceNotFoundException("TicketAssignment", "id", assignmentId));

        return mapToResponse(assignment);
    }

    @Transactional
    public TicketAssignmentResponse updateAssignment(UUID ticketPublicId, Long assignmentId, UpdateAssignmentRequest request) {
        User currentUser = getCurrentUser();
        validateManagerOrAdmin(currentUser);

        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        TicketAssignment assignment = ticketAssignmentRepository.findByAssignmentIdAndTicketId(assignmentId, ticket)
                .orElseThrow(() -> new ResourceNotFoundException("TicketAssignment", "id", assignmentId));

        StringBuilder activityNotes = new StringBuilder("Assignment #" + assignmentId + " updated: ");
        boolean changed = false;

        User newAgent = resolveUser(request.agentPublicId(), request.assignedToEmail(), request.assignedToName(), "agent");
        if (newAgent != null) {
            if (!Boolean.TRUE.equals(newAgent.getIsActive())) {
                throw new IllegalArgumentException("Cannot assign ticket to an inactive user");
            }
            String oldAgentName = assignment.getAssignedTo() != null ? assignment.getAssignedTo().getName() : "None";
            activityNotes.append("agent changed from ").append(oldAgentName)
                    .append(" to ").append(newAgent.getName()).append("; ");
            assignment.setAssignedTo(newAgent);
            changed = true;
        }

        User newAssignedBy = resolveUser(request.assignedByPublicId(), request.assignedByEmail(), null, "assignedBy");
        if (newAssignedBy != null) {
            String oldAssignedByName = assignment.getAssignedBy() != null ? assignment.getAssignedBy().getName() : "None";
            activityNotes.append("assignedBy changed from ").append(oldAssignedByName)
                    .append(" to ").append(newAssignedBy.getName()).append("; ");
            assignment.setAssignedBy(newAssignedBy);
            changed = true;
        }

        if (request.isActive() != null) {
            activityNotes.append("isActive changed from ").append(assignment.getIsActive())
                    .append(" to ").append(request.isActive()).append("; ");
            assignment.setIsActive(request.isActive());
            changed = true;
        }

        if (request.assignedAt() != null) {
            activityNotes.append("assignedAt changed to ").append(request.assignedAt()).append("; ");
            assignment.setAssignedAt(request.assignedAt());
            changed = true;
        }

        if (changed) {
            assignment = ticketAssignmentRepository.save(assignment);
            ticketActivityRepository.save(TicketActivity.builder()
                    .ticketId(ticket)
                    .userId(currentUser)
                    .description(activityNotes.toString().trim())
                    .build());

            if (newAgent != null) {
                notificationService.createNotification(
                        newAgent,
                        ticket,
                        "Ticket Assigned",
                        "Ticket #" + ticket.getTicketId() + " (" + ticket.getTitle() + ") has been assigned to you by " + currentUser.getName(),
                        "ASSIGNMENT"
                );
            }
            log.info("Ticket assignment #" + assignmentId + " updated by " + currentUser.getEmail());
        }

        return mapToResponse(assignment);
    }

    @Transactional
    public void deleteAssignment(UUID ticketPublicId, Long assignmentId) {
        User currentUser = getCurrentUser();
        validateManagerOrAdmin(currentUser);

        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        TicketAssignment assignment = ticketAssignmentRepository.findByAssignmentIdAndTicketId(assignmentId, ticket)
                .orElseThrow(() -> new ResourceNotFoundException("TicketAssignment", "id", assignmentId));

        String agentName = assignment.getAssignedTo() != null ? assignment.getAssignedTo().getName() : "Unknown";

        ticketAssignmentRepository.delete(assignment);

        ticketActivityRepository.save(TicketActivity.builder()
                .ticketId(ticket)
                .userId(currentUser)
                .description("Assignment #" + assignmentId + " for agent " + agentName + " was deleted by " + currentUser.getName())
                .build());

        log.info("Ticket assignment #" + assignmentId + " deleted by " + currentUser.getEmail());
    }

    private TicketAssignmentResponse mapToResponse(TicketAssignment a) {
        return new TicketAssignmentResponse(
                a.getAssignmentId(),
                a.getTicketId() != null ? a.getTicketId().getTicketPublicId() : null,
                a.getAssignedTo() != null ? a.getAssignedTo().getUserPublicId() : null,
                a.getAssignedTo() != null ? a.getAssignedTo().getName() : null,
                a.getAssignedTo() != null ? a.getAssignedTo().getEmail() : null,
                a.getAssignedBy() != null ? a.getAssignedBy().getUserPublicId() : null,
                a.getAssignedBy() != null ? a.getAssignedBy().getName() : null,
                a.getIsActive(),
                a.getAssignedAt(),
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}
