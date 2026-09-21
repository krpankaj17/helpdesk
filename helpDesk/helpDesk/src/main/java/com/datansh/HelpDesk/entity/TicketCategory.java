package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@Table(name = "ticket_categories")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TicketCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long categoryId;
    @Column(name = "name",unique = true,nullable = false,length = 80)
    private  String name;

    @Column(name = "description")
    private  String description;
}
