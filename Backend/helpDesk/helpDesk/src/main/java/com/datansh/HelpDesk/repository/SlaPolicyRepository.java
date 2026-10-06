package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Priority;
import com.datansh.HelpDesk.entity.SlaPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Long> {
    Optional<SlaPolicy> findByPriorityId(Priority priority);

    boolean existsByPriorityId(Priority priority);

    boolean existsByPriorityIdAndPolicyIdNot(Priority priority, Long policyId);
}
