package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.TicketAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketAssignmentRepository extends JpaRepository<TicketAssignment,Long> {
}
