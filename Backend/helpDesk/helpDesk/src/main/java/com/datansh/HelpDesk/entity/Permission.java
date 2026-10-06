package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Table(name = "permissions")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "permission_id", nullable = false)
    private Long permissionId;
    @Size(max = 60)
    @NotNull
    @Column(name = "name", nullable = false, length = 60)
    private String name;
    @Column(name = "description")
    private String description;
}
