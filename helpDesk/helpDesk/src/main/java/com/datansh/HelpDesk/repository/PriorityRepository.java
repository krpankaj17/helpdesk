package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Priority;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PriorityRepository extends JpaRepository<Priority,Long> {
}
