package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(name = "priorities")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Priority {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "priority_id", nullable = false)
    private Long priorityId;

    @Size(max = 60)
    @NotNull
    @Column(name = "name", nullable = false, length = 60,unique = true)
    private String name;

    @Column(name = "description")
    private String description;

}
