package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "ticket_activities",indexes = {
        @Index(name = "idx_ticket_activities_ticket_id",columnList = "ticket_id")
})
public class TicketActivity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_id")
    private Long activityId;
    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User userId;

    @ManyToOne
    @JoinColumn(name = "ticket_id")
    private Ticket ticketId;

    @CreationTimestamp
    @Column(name = "createdAt",nullable = false)
    private OffsetDateTime  createdAt;
}
