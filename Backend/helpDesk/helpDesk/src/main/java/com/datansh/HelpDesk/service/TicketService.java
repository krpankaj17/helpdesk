package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.AttachmentResponse;
import com.datansh.HelpDesk.dto.CreateAttachmentRequest;
import com.datansh.HelpDesk.dto.CreateTicketRequest;
import com.datansh.HelpDesk.dto.DashboardMetricsResponse;
import com.datansh.HelpDesk.dto.TicketActivityResponse;
import com.datansh.HelpDesk.dto.TicketResponse;
import com.datansh.HelpDesk.dto.UpdateTicketStatusRequest;
import com.datansh.HelpDesk.entity.Attachment;
import com.datansh.HelpDesk.entity.Note;
import com.datansh.HelpDesk.entity.Priority;
import com.datansh.HelpDesk.entity.SlaPolicy;
import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.TicketActivity;
import com.datansh.HelpDesk.entity.TicketAssignment;
import com.datansh.HelpDesk.entity.TicketCategory;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.enums.TicketStatus;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.AttachmentRepository;
import com.datansh.HelpDesk.repository.NoteRepository;
import com.datansh.HelpDesk.repository.PriorityRepository;
import com.datansh.HelpDesk.repository.SlaPolicyRepository;
import com.datansh.HelpDesk.repository.TicketActivityRepository;
import com.datansh.HelpDesk.repository.TicketAssignmentRepository;
import com.datansh.HelpDesk.repository.TicketCategoryRepository;
import com.datansh.HelpDesk.repository.TicketRepository;
import com.datansh.HelpDesk.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.datansh.HelpDesk.specification.TicketSpecification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class TicketService {
    private static final Logger log = LoggerFactory.getLogger(TicketService.class);
    private final TicketRepository ticketRepository;
    private final PriorityRepository priorityRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final SlaPolicyRepository slaPolicyRepository;
    private final UserRepository userRepository;
    private final TicketAssignmentRepository ticketAssignmentRepository;
    private final NoteRepository noteRepository;
    private final TicketActivityRepository ticketActivityRepository;
    private final AttachmentRepository attachmentRepository;
    private final NotificationService notificationService;

    public TicketService(TicketRepository ticketRepository,
                         PriorityRepository priorityRepository,
                         TicketCategoryRepository ticketCategoryRepository,
                         SlaPolicyRepository slaPolicyRepository,
                         UserRepository userRepository,
                         TicketAssignmentRepository ticketAssignmentRepository,
                         NoteRepository noteRepository,
                         TicketActivityRepository ticketActivityRepository,
                         AttachmentRepository attachmentRepository,
                         NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.priorityRepository = priorityRepository;
        this.ticketCategoryRepository = ticketCategoryRepository;
        this.slaPolicyRepository = slaPolicyRepository;
        this.userRepository = userRepository;
        this.ticketAssignmentRepository = ticketAssignmentRepository;
        this.noteRepository = noteRepository;
        this.ticketActivityRepository = ticketActivityRepository;
        this.attachmentRepository = attachmentRepository;
        this.notificationService = notificationService;
    }

    public Page<TicketResponse> getAllTickets(String search,
                                              TicketStatus status,
                                              Long priorityId,
                                              Long categoryId,
                                              Boolean unassigned,
                                              Pageable pageable) {
        return getAllTickets(search, status, priorityId, categoryId, unassigned, null, pageable);
    }

    public Page<TicketResponse> getAllTickets(String search,
                                              TicketStatus status,
                                              Long priorityId,
                                              Long categoryId,
                                              Boolean unassigned,
                                              String agentEmail,
                                              Pageable pageable) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Page.empty();
        }

        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";

        Specification<Ticket> spec = TicketSpecification.filter(
                search,
                status,
                priorityId,
                categoryId,
                unassigned,
                agentEmail,
                currentUser,
                role
        );

        Page<Ticket> tickets = ticketRepository.findAll(spec, pageable);
        return tickets.map(this::mapToResponse);
    }

    public TicketResponse getTicketByPublicId(UUID ticketPublicId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessTicket(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to view this ticket");
        }

        return mapToResponse(ticket);
    }

    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request) {
        TicketCategory category = ticketCategoryRepository.findById(request.category())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.category()));

        Priority priority = priorityRepository.findById(request.priority())
                .orElseThrow(() -> new ResourceNotFoundException("Priority", "id", request.priority()));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User requestor = null;
        if (authentication != null && authentication.isAuthenticated()) {
            requestor = userRepository.findByEmail(authentication.getName()).orElse(null);
        }

        OffsetDateTime now = OffsetDateTime.now();
        Optional<SlaPolicy> slaPolicyOpt = slaPolicyRepository.findByPriorityId(priority);
        Duration responseDuration = slaPolicyOpt.map(SlaPolicy::getResponseTime).orElse(Duration.ofHours(4));
        Duration resolutionDuration = slaPolicyOpt.map(SlaPolicy::getResolutionTime).orElse(Duration.ofHours(24));

        OffsetDateTime responseDeadline = now.plus(responseDuration);
        OffsetDateTime resolutionDeadline = now.plus(resolutionDuration);

        Ticket ticket = Ticket.builder()
                .title(request.title())
                .description(request.description())
                .category(category)
                .ticketPriority(priority)
                .requestor(requestor)
                .status(TicketStatus.OPEN)
                .responseDeadline(responseDeadline)
                .resolutionDeadline(resolutionDeadline)
                .build();

        Ticket savedTicket = ticketRepository.save(ticket);
        log.info("Ticket created with publicId: " + savedTicket.getTicketPublicId() + ", priority: " + priority.getName());

        List<AttachmentResponse> attachmentResponses = new ArrayList<>();
        if (request.attachments() != null && !request.attachments().isEmpty()) {
            for (CreateAttachmentRequest attReq : request.attachments()) {
                Attachment attachment = Attachment.builder()
                        .title(attReq.title())
                        .description(attReq.description())
                        .url(attReq.url())
                        .ticketId(savedTicket)
                        .build();
                Attachment savedAtt = attachmentRepository.save(attachment);
                attachmentResponses.add(mapToAttachmentResponse(savedAtt));
            }
        }

        ticketActivityRepository.save(TicketActivity.builder()
                .ticketId(savedTicket)
                .userId(requestor)
                .description("Ticket created with status OPEN by " + (requestor != null ? requestor.getName() : "Unknown"))
                .build());

        if (requestor != null) {
            notificationService.createNotification(
                    requestor,
                    savedTicket,
                    "Ticket Created",
                    "Your ticket #" + savedTicket.getTicketId() + " (" + savedTicket.getTitle() + ") has been submitted.",
                    "TICKET_CREATED"
            );
        }

        try {
            List<User> staff = userRepository.findByRoleNames(List.of("ADMIN", "SUPPORT_MANAGER"));
            for (User staffUser : staff) {
                if (requestor == null || !staffUser.getUserId().equals(requestor.getUserId())) {
                    notificationService.createNotification(
                            staffUser,
                            savedTicket,
                            "New Ticket Submitted",
                            "New ticket #" + savedTicket.getTicketId() + " (" + savedTicket.getTitle() + ") in " + category.getName() + " submitted by " + (requestor != null ? requestor.getName() : "Requester"),
                            "NEW_TICKET"
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Could not send staff notifications for new ticket: {}", e.getMessage());
        }

        return mapToResponse(savedTicket, attachmentResponses);
    }

    public TicketResponse mapToResponse(Ticket ticket) {
        List<AttachmentResponse> attachmentResponses = attachmentRepository
                .findByTicketIdAndCommentIdIsNullAndNoteIdIsNull(ticket)
                .stream()
                .map(this::mapToAttachmentResponse)
                .toList();
        return mapToResponse(ticket, attachmentResponses);
    }

    public TicketResponse mapToResponse(Ticket ticket, List<AttachmentResponse> attachments) {
        Long categoryId = ticket.getCategory() != null ? ticket.getCategory().getCategoryId() : null;
        String categoryName = ticket.getCategory() != null ? ticket.getCategory().getName() : null;
        Long priorityId = ticket.getTicketPriority() != null ? ticket.getTicketPriority().getPriorityId() : null;
        String priorityName = ticket.getTicketPriority() != null ? ticket.getTicketPriority().getName() : null;
        UUID requestorPublicId = ticket.getRequestor() != null ? ticket.getRequestor().getUserPublicId() : null;
        String requestorName = ticket.getRequestor() != null ? ticket.getRequestor().getName() : null;
        String requestorEmail = ticket.getRequestor() != null ? ticket.getRequestor().getEmail() : null;

        OffsetDateTime now = OffsetDateTime.now();
        boolean isResponseOverdue = false;
        boolean isResponseAtRisk = false;
        boolean isResolutionOverdue = false;
        boolean isResolutionAtRisk = false;

        if (ticket.getResponseDeadline() != null && TicketStatus.OPEN.equals(ticket.getStatus())) {
            if (now.isAfter(ticket.getResponseDeadline())) {
                isResponseOverdue = true;
            } else if (now.plusHours(1).isAfter(ticket.getResponseDeadline())) {
                isResponseAtRisk = true;
            }
        }

        if (ticket.getResolutionDeadline() != null) {
            boolean isResolvedOrClosed = TicketStatus.RESOLVED.equals(ticket.getStatus()) || TicketStatus.CLOSED.equals(ticket.getStatus());
            if (!isResolvedOrClosed) {
                if (now.isAfter(ticket.getResolutionDeadline())) {
                    isResolutionOverdue = true;
                } else if (now.plusHours(2).isAfter(ticket.getResolutionDeadline())) {
                    isResolutionAtRisk = true;
                }
            }
        }

        TicketAssignment activeAssignment = ticketAssignmentRepository.findFirstByTicketIdAndIsActiveTrueOrderByAssignmentIdDesc(ticket).orElse(null);
        UUID assignedAgentPublicId = activeAssignment != null && activeAssignment.getAssignedTo() != null ? activeAssignment.getAssignedTo().getUserPublicId() : null;
        String assignedAgentName = activeAssignment != null && activeAssignment.getAssignedTo() != null ? activeAssignment.getAssignedTo().getName() : null;
        String assignedAgentEmail = activeAssignment != null && activeAssignment.getAssignedTo() != null ? activeAssignment.getAssignedTo().getEmail() : null;

        return new TicketResponse(
                ticket.getTicketPublicId(),
                ticket.getTitle(),
                ticket.getDescription(),
                categoryId,
                categoryName,
                priorityId,
                priorityName,
                requestorPublicId,
                requestorName,
                requestorEmail,
                ticket.getStatus(),
                ticket.getResponseDeadline(),
                ticket.getResolutionDeadline(),
                isResponseOverdue,
                isResponseAtRisk,
                isResolutionOverdue,
                isResolutionAtRisk,
                attachments != null ? attachments : List.of(),
                ticket.getCreatedAt(),
                assignedAgentPublicId,
                assignedAgentName,
                assignedAgentEmail
        );
    }

    private AttachmentResponse mapToAttachmentResponse(Attachment attachment) {
        return new AttachmentResponse(
                attachment.getAttachmentId(),
                attachment.getTitle(),
                attachment.getDescription(),
                attachment.getUrl(),
                attachment.getCreatedAt()
        );
    }

    @Transactional
    public TicketResponse updateTicketStatus(UUID ticketPublicId, UpdateTicketStatusRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";

        if (TicketStatus.CLOSED.equals(ticket.getStatus()) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Closed tickets cannot be edited except by an Admin");
        }

        if ("REQUESTER".equals(role)) {
            throw new AccessDeniedException("Requesters do not have permission to change ticket status");
        }

        if ("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) {
            boolean isAssigned = ticketAssignmentRepository.existsByTicketIdAndAssignedToAndIsActive(ticket, currentUser, true);
            if (!isAssigned) {
                throw new AccessDeniedException("You are not assigned to this ticket and cannot update its status");
            }
        } else if (!"ADMIN".equals(role) && !"SUPPORT_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access denied");
        }

        validateStatusTransition(ticket.getStatus(), request.status(), role);

        if (TicketStatus.RESOLVED.equals(request.status())) {
            if (request.resolutionNote() == null || request.resolutionNote().trim().isEmpty()) {
                throw new IllegalArgumentException("A resolution note is required before marking a ticket as RESOLVED");
            }

            Note resolutionNote = Note.builder()
                    .ticketId(ticket)
                    .userId(currentUser)
                    .description("Resolution Note: " + request.resolutionNote().trim())
                    .build();
            noteRepository.save(resolutionNote);
        }

        TicketStatus oldStatus = ticket.getStatus();
        ticket.setStatus(request.status());
        Ticket updatedTicket = ticketRepository.save(ticket);
        log.info("Ticket " + ticketPublicId + " status updated from " + oldStatus + " to " + request.status() + " by " + currentUser.getEmail());

        String activityDesc = "Status changed from " + oldStatus + " to " + request.status() + " by " + currentUser.getName();
        if (TicketStatus.RESOLVED.equals(request.status()) && request.resolutionNote() != null && !request.resolutionNote().isBlank()) {
            activityDesc = activityDesc + " with resolution note: " + request.resolutionNote().trim();
        }

        ticketActivityRepository.save(TicketActivity.builder()
                .ticketId(ticket)
                .userId(currentUser)
                .description(activityDesc)
                .build());

        if (ticket.getRequestor() != null && !ticket.getRequestor().getUserId().equals(currentUser.getUserId())) {
            notificationService.createNotification(
                    ticket.getRequestor(),
                    ticket,
                    "Ticket Status Updated",
                    "Your ticket #" + ticket.getTicketId() + " (" + ticket.getTitle() + ") status has been updated to " + request.status(),
                    "STATUS_CHANGE"
            );
        }

        return mapToResponse(updatedTicket);
    }

    @Transactional
    public TicketResponse updateTicketCategory(UUID ticketPublicId, Long categoryId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";
        if ("REQUESTER".equals(role)) {
            throw new AccessDeniedException("Requesters do not have permission to reassign ticket categories");
        }

        TicketCategory newCategory = ticketCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        String oldCatName = ticket.getCategory() != null ? ticket.getCategory().getName() : "Unassigned";
        ticket.setCategory(newCategory);
        Ticket updatedTicket = ticketRepository.save(ticket);
        log.info("Ticket {} category changed from '{}' to '{}' by {}", ticketPublicId, oldCatName, newCategory.getName(), currentUser.getEmail());

        ticketActivityRepository.save(TicketActivity.builder()
                .ticketId(updatedTicket)
                .userId(currentUser)
                .description("Category reassigned from " + oldCatName + " to " + newCategory.getName() + " by " + currentUser.getName())
                .build());

        if (ticket.getRequestor() != null && !ticket.getRequestor().getUserId().equals(currentUser.getUserId())) {
            notificationService.createNotification(
                    ticket.getRequestor(),
                    ticket,
                    "Ticket Category Updated",
                    "Your ticket #" + ticket.getTicketId() + " (" + ticket.getTitle() + ") category was changed to " + newCategory.getName(),
                    "CATEGORY_CHANGE"
            );
        }

        return mapToResponse(updatedTicket);
    }

    private void validateStatusTransition(TicketStatus currentStatus, TicketStatus newStatus, String role) {
        if (currentStatus.equals(newStatus)) {
            return;
        }

        if (("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) && newStatus == TicketStatus.CLOSED) {
            throw new AccessDeniedException("Support agents cannot close tickets. Only administrators or support managers can close tickets.");
        }

        if ("ADMIN".equals(role)) {
            return;
        }

        boolean valid = switch (currentStatus) {
            case OPEN -> newStatus == TicketStatus.IN_PROGRESS || (!("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) && newStatus == TicketStatus.CLOSED);
            case IN_PROGRESS -> newStatus == TicketStatus.WAITING_ON_REQUESTOR || newStatus == TicketStatus.RESOLVED || (!("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) && newStatus == TicketStatus.CLOSED);
            case WAITING_ON_REQUESTOR -> newStatus == TicketStatus.IN_PROGRESS || newStatus == TicketStatus.RESOLVED || (!("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) && newStatus == TicketStatus.CLOSED);
            case RESOLVED -> (!("SUPPORT_AGENT".equals(role) || "AGENT".equals(role)) && newStatus == TicketStatus.CLOSED) || newStatus == TicketStatus.IN_PROGRESS;
            case CLOSED -> false;
        };

        if (!valid) {
            throw new IllegalArgumentException("Cannot transition ticket status from " + currentStatus + " to " + newStatus);
        }
    }

    public List<TicketActivityResponse> getTicketActivities(UUID ticketPublicId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        Ticket ticket = ticketRepository.findByTicketPublicId(ticketPublicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "publicId", ticketPublicId));

        if (!canAccessTicket(ticket, currentUser)) {
            throw new AccessDeniedException("You do not have permission to view activity for this ticket");
        }

        return ticketActivityRepository.findByTicketIdOrderByCreatedAtAsc(ticket).stream()
                .map(this::mapToActivityResponse)
                .toList();
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

    private TicketActivityResponse mapToActivityResponse(TicketActivity a) {
        return new TicketActivityResponse(
                a.getActivityId(),
                a.getTicketId() != null ? a.getTicketId().getTicketPublicId() : null,
                a.getDescription(),
                a.getUserId() != null ? a.getUserId().getUserPublicId() : null,
                a.getUserId() != null ? a.getUserId().getName() : null,
                a.getUserId() != null && a.getUserId().getRole() != null ? a.getUserId().getRole().getName() : null,
                a.getCreatedAt()
        );
    }

    public DashboardMetricsResponse getDashboardMetrics() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        String role = currentUser.getRole() != null ? currentUser.getRole().getName() : "";
        boolean isAgent = "SUPPORT_AGENT".equals(role) || "AGENT".equals(role);
        boolean isRequester = "REQUESTER".equals(role);

        OffsetDateTime now = OffsetDateTime.now();

        Object[] statusResult = isRequester
                ? ticketRepository.countTicketStatusesForRequestor(currentUser, now)
                : (isAgent
                    ? ticketRepository.countTicketStatusesForAgent(currentUser, now)
                    : ticketRepository.countTicketStatuses(now));

        Object[] statusCounts = (statusResult != null && statusResult.length > 0 && statusResult[0] instanceof Object[])
                ? (Object[]) statusResult[0]
                : statusResult;

        long total = statusCounts != null && statusCounts.length > 0 && statusCounts[0] != null ? ((Number) statusCounts[0]).longValue() : 0L;
        long open = statusCounts != null && statusCounts.length > 1 && statusCounts[1] != null ? ((Number) statusCounts[1]).longValue() : 0L;
        long inProgress = statusCounts != null && statusCounts.length > 2 && statusCounts[2] != null ? ((Number) statusCounts[2]).longValue() : 0L;
        long waiting = statusCounts != null && statusCounts.length > 3 && statusCounts[3] != null ? ((Number) statusCounts[3]).longValue() : 0L;
        long resolved = statusCounts != null && statusCounts.length > 4 && statusCounts[4] != null ? ((Number) statusCounts[4]).longValue() : 0L;
        long closed = statusCounts != null && statusCounts.length > 5 && statusCounts[5] != null ? ((Number) statusCounts[5]).longValue() : 0L;
        long overdue = statusCounts != null && statusCounts.length > 6 && statusCounts[6] != null ? ((Number) statusCounts[6]).longValue() : 0L;

        long unassigned = (isAgent || isRequester) ? 0L : ticketRepository.countUnassignedTickets();

        Map<String, Long> priorityMap = new HashMap<>();
        List<Object[]> priorityRows = isRequester
                ? ticketRepository.countTicketsByPriorityForRequestor(currentUser)
                : (isAgent
                    ? ticketRepository.countTicketsByPriorityForAgent(currentUser)
                    : ticketRepository.countTicketsByPriority());
        if (priorityRows != null) {
            for (Object[] row : priorityRows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    priorityMap.put(row[0].toString(), ((Number) row[1]).longValue());
                }
            }
        }

        Map<String, Long> agentWorkload = new HashMap<>();
        if (!isAgent && !isRequester) {
            List<Object[]> workloadRows = ticketAssignmentRepository.countActiveTicketsPerAgent();
            if (workloadRows != null) {
                for (Object[] row : workloadRows) {
                    if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                        agentWorkload.put(row[0].toString(), ((Number) row[1]).longValue());
                    }
                }
            }
        }

        return new DashboardMetricsResponse(
                total,
                open,
                inProgress,
                waiting,
                resolved,
                closed,
                overdue,
                unassigned,
                priorityMap,
                agentWorkload
        );
    }
}
