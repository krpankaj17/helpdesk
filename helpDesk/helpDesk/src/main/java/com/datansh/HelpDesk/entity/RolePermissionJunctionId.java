package com.datansh.HelpDesk.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

;

@Getter
@Setter
@EqualsAndHashCode
@Embeddable
public class RolePermissionJunctionId implements Serializable {
    @Serial
    private static final long serialVersionUID = 7742844817134599924L;
    @NotNull
    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @NotNull
    @Column(name = "permission_id", nullable = false)
    private Long permissionId;


}