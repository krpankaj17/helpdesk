package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Generated;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId ;
    @Generated
    @Column(name = "user_public_id", nullable = false, unique = true)
    private UUID userPublicId;
    @Column(name = "email", nullable = false )
    private String email;
    @Column(name = "password", nullable = false )
    private String password;
    @Column(name = "name", nullable = false   )
    private String name;
    @Column(name = "role_id")
    private Long roleId;
    @ColumnDefault("true")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
    @Generated
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
    @Generated
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;


}
