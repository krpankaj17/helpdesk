package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class TicketAssignment {
    @Id
    @Column(name = "assignment_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long assignmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_user_id")
    private User assignedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_user_id")
    private  User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticketId;

    @Column(name = "is_active",nullable = false)
    private Boolean isActive;

    @Column(name = "assigned_at")
    private OffsetDateTime assignedAt;

    @Column(name = "created_at")
    @CreationTimestamp
    private OffsetDateTime createdAt;

    @Column(name="updated_at")
    @UpdateTimestamp
    private OffsetDateTime updatedAt;



}
