package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.RolePermissionId;
import com.datansh.HelpDesk.entity.RolePermissionJunction;
import lombok.Locked;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
@Repository
public interface RolePermissionJunctionRepository extends JpaRepository<RolePermissionJunction, RolePermissionId> {
    @Query("""
    SELECT rpj
    FROM RolePermissionJunction rpj
    JOIN FETCH rpj.permission
    WHERE rpj.role.roleId = :roleId
    """)
    List<RolePermissionJunction> findPermissionsByRoleId(@Param("roleId") Long roleId);

    @Modifying
    @Query("DELETE FROM RolePermissionJunction rpj WHERE rpj.role.roleId = :roleId")
    void deleteByRoleId(@Param("roleId") Long roleId);
}
