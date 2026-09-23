package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.RolePermissionJunction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RolePermissionJunctionRepository extends JpaRepository<RolePermissionJunction,Long> {
    @Query("""
    SELECT rpj
    FROM RolePermissionJunction rpj
    JOIN FETCH rpj.permission
    WHERE rpj.role.roleId = :roleId
    """)
    List<RolePermissionJunction> findPermissionsByRoleId(Long roleId);
}
