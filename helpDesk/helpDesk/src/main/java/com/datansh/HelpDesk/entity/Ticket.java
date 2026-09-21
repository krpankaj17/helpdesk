package com.datansh.HelpDesk.entity;

import com.datansh.HelpDesk.enums.TicketStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tickets",indexes = {
@Index(name = "idx_index_requestor", columnList = "requestor_id"),
        @Index(name = "idx_ticket_category_id", columnList = "category_id"),
@Index(name = "idx_ticket_priority_id",columnList = "ticket_priority_id")})
@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Ticket {
    @Id
    @Column(name = "ticket_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private  Long ticketId  ;

    @UuidGenerator
    @Column(name = "ticket_public_id",unique = true,nullable = false)
    private UUID ticketPublicId;

    @Column(name = "title",length = 80,nullable = false)
    private String title ;

     @Column(name = "description")
     private  String  Description;
     
     @ManyToOne(fetch = FetchType.LAZY)
     @JoinColumn(name = "category_id")
     private TicketCategory category;

     @ManyToOne(fetch = FetchType.LAZY)
     @JoinColumn(name = "ticket_priority_id")
     private Priority  ticketPriority;

     @ManyToOne(fetch = FetchType.LAZY)
     @JoinColumn(name = "requestor_id")
     private User requestor;
     @Enumerated(EnumType.STRING)
     @Column(name = "status",nullable = false)
     private TicketStatus Status;

     @CreationTimestamp
     @Column(name = "created_at",nullable = false)
     private OffsetDateTime createdAt;
     @UpdateTimestamp
     @Column(name="updated_at",nullable = false)
     private  OffsetDateTime updatedAt;
     @Column(name = "response_deadline",nullable = false)
     private  OffsetDateTime responseDeadline;
     @Column(name = "resolution_deadline",nullable = false)
     private  OffsetDateTime resolutionDeadline;





}
