package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket,Long> {
}
