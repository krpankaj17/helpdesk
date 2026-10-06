package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
       @Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    Page<Ticket> findByRequestor(User requestor, Pageable pageable);

    Optional<Ticket> findByTicketPublicId(UUID ticketPublicId);

    @Query("""
        SELECT t FROM Ticket t
        JOIN TicketAssignment ta ON ta.ticketId = t
        WHERE ta.assignedTo = :agent AND ta.isActive = true
    """)
    Page<Ticket> findAssignedTicketsForAgent(@Param("agent") User agent, Pageable pageable);

    @Query("""
        SELECT 
            COUNT(t),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.OPEN THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.IN_PROGRESS THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.WAITING_ON_REQUESTOR THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.RESOLVED THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.CLOSED THEN 1 END),
            COUNT(CASE WHEN t.status NOT IN (com.datansh.HelpDesk.enums.TicketStatus.RESOLVED, com.datansh.HelpDesk.enums.TicketStatus.CLOSED) AND t.resolutionDeadline < :now THEN 1 END)
        FROM Ticket t
    """)
    Object[] countTicketStatuses(@Param("now") OffsetDateTime now);

    @Query("""
        SELECT 
            COUNT(t),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.OPEN THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.IN_PROGRESS THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.WAITING_ON_REQUESTOR THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.RESOLVED THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.CLOSED THEN 1 END),
            COUNT(CASE WHEN t.status NOT IN (com.datansh.HelpDesk.enums.TicketStatus.RESOLVED, com.datansh.HelpDesk.enums.TicketStatus.CLOSED) AND t.resolutionDeadline < :now THEN 1 END)
        FROM Ticket t
        JOIN TicketAssignment ta ON ta.ticketId = t
        WHERE ta.assignedTo = :agent AND ta.isActive = true
    """)
    Object[] countTicketStatusesForAgent(@Param("agent") User agent, @Param("now") OffsetDateTime now);

    @Query("""
        SELECT 
            COUNT(t),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.OPEN THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.IN_PROGRESS THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.WAITING_ON_REQUESTOR THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.RESOLVED THEN 1 END),
            COUNT(CASE WHEN t.status = com.datansh.HelpDesk.enums.TicketStatus.CLOSED THEN 1 END),
            COUNT(CASE WHEN t.status NOT IN (com.datansh.HelpDesk.enums.TicketStatus.RESOLVED, com.datansh.HelpDesk.enums.TicketStatus.CLOSED) AND t.resolutionDeadline < :now THEN 1 END)
        FROM Ticket t
        WHERE t.requestor = :requestor
    """)
    Object[] countTicketStatusesForRequestor(@Param("requestor") User requestor, @Param("now") OffsetDateTime now);

    @Query("""
        SELECT COUNT(t) FROM Ticket t 
        WHERE t.status NOT IN (com.datansh.HelpDesk.enums.TicketStatus.RESOLVED, com.datansh.HelpDesk.enums.TicketStatus.CLOSED)
        AND NOT EXISTS (
            SELECT 1 FROM TicketAssignment a 
            WHERE a.ticketId = t AND a.isActive = true
        )
    """)
    long countUnassignedTickets();

    @Query("SELECT p.name, COUNT(t) FROM Ticket t JOIN t.ticketPriority p GROUP BY p.name")
    List<Object[]> countTicketsByPriority();

    @Query("""
        SELECT p.name, COUNT(t) FROM Ticket t 
        JOIN t.ticketPriority p 
        JOIN TicketAssignment ta ON ta.ticketId = t
        WHERE ta.assignedTo = :agent AND ta.isActive = true
        GROUP BY p.name
    """)
    List<Object[]> countTicketsByPriorityForAgent(@Param("agent") User agent);

    @Query("SELECT p.name, COUNT(t) FROM Ticket t JOIN t.ticketPriority p WHERE t.requestor = :requestor GROUP BY p.name")
    List<Object[]> countTicketsByPriorityForRequestor(@Param("requestor") User requestor);

    @Query("SELECT t.category.categoryId, COUNT(t) FROM Ticket t WHERE t.category IS NOT NULL GROUP BY t.category.categoryId")
    List<Object[]> countTicketsByCategory();

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Ticket t SET t.category = null WHERE t.category.categoryId = :categoryId")
    void disassociateCategoryFromTickets(@Param("categoryId") Long categoryId);
}
