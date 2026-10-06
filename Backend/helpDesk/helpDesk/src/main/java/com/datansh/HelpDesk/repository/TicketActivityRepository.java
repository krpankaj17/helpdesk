package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Ticket;
import com.datansh.HelpDesk.entity.TicketActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
  @Repository
public interface TicketActivityRepository extends JpaRepository<TicketActivity, Long> {
    List<TicketActivity> findByTicketIdOrderByCreatedAtAsc(Ticket ticketId);
}
