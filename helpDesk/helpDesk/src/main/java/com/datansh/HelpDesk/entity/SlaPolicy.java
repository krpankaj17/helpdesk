package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Duration;

@Entity
@Table(name = "sla_policies")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SlaPolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "policy_id", nullable = false)
    private Long policyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "priority_id", nullable = false)
    private Priority priorityId;

    @Column(name = "description")
    private String description;

    @Column(name = "response_time", nullable = false)
    @JdbcTypeCode(SqlTypes.INTERVAL_SECOND)
    private Duration responseTime;

    @Column(name = "resolution_time", nullable = false)
    @JdbcTypeCode(SqlTypes.INTERVAL_SECOND)
    private Duration resolutionTime;

    

}
