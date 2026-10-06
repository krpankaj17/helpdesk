package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "notes")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Note {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private  Long noteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User userId;

    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id",nullable = false)
    private Ticket ticketId;

    @Column(name = "created_at",nullable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;
    @Column(name="updated_at",nullable = false)
    @UpdateTimestamp
    private OffsetDateTime updatedAt;

}
