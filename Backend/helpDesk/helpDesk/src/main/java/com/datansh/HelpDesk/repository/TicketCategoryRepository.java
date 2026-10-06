package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.TicketCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketCategoryRepository extends JpaRepository<TicketCategory,Long> {
}
