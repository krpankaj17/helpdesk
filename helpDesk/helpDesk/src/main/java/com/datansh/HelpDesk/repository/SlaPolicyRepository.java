package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.SlaPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlaPolicyRepository extends JpaRepository<SlaPolicy,Long> {
}
