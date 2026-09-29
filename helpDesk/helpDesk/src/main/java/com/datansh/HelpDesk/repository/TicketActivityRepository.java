package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.TicketActivity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketActivityRepository extends JpaRepository<TicketActivity,Long> {
}
