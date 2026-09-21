package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "attachments",indexes = {
        @Index(name = "idx_attachments_ticket_id",columnList = "ticket_id")  ,
        @Index(name = "idx_attachments_notes_id",columnList = "note_id")
})
public class Attachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private  Long attachmentId;

    @Column(name = "title",nullable = false,length = 50)
    private  String title;

    @Column(name = "description")
    private  String description;

    @Column(name = "url")
    private  String url;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticketId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id")
    private Note noteId;

    @CreationTimestamp
    @Column(name = "createdAt",nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt",nullable = false)
    private  OffsetDateTime updatedAt;

}
