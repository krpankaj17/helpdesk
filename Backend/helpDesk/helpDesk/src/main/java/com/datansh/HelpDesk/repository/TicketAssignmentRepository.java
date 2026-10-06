package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.TicketAssignment;
import com.datansh.HelpDesk.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
      @Repository
public interface TicketAssignmentRepository extends JpaRepository<TicketAssignment, Long> {
    boolean existsByTicketIdAndAssignedToAndIsActive(Ticket ticketId, User assignedTo, Boolean isActive);

    List<TicketAssignment> findByTicketIdOrderByCreatedAtDesc(Ticket ticketId);

    Optional<TicketAssignment> findByTicketIdAndIsActiveTrue(Ticket ticketId);

    Optional<TicketAssignment> findFirstByTicketIdAndIsActiveTrueOrderByAssignmentIdDesc(Ticket ticketId);

    Optional<TicketAssignment> findByAssignmentIdAndTicketId(Long assignmentId, Ticket ticketId);

    @Query("""
        SELECT a.assignedTo.name, COUNT(a) 
        FROM TicketAssignment a 
        WHERE a.isActive = true 
          AND a.ticketId.status NOT IN (com.datansh.HelpDesk.enums.TicketStatus.RESOLVED, com.datansh.HelpDesk.enums.TicketStatus.CLOSED) 
        GROUP BY a.assignedTo.name
    """)
    List<Object[]> countActiveTicketsPerAgent();
}

