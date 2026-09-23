package com.datansh.HelpDesk.entity;

import jakarta.persistence.*;
import lombok.*;

@Table(name = "role_permission_junction")
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class RolePermissionJunction {
    @EmbeddedId
    private RolePermissionId rolePermissionId;
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleId")
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("permissionId")
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

}
