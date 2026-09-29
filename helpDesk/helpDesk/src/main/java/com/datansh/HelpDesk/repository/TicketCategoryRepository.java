package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.TicketCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketCategoryRepository extends JpaRepository<TicketCategory,Long> {
}
