package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Priority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PriorityRepository extends JpaRepository<Priority,Long> {
}
