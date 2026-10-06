package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.User;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User,Long>, JpaSpecificationExecutor<User> {
  Optional<User> findByUserPublicId(UUID userPublicId);

  @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
  Optional<User> findByEmail(@Param("email") String email);

  Optional<User> findByEmailIgnoreCase(String email);

  Optional<User> findFirstByName(String name);

  @Query("SELECT u FROM User u WHERE u.role.name IN :roleNames")
  List<User> findByRoleNames(@Param("roleNames") List<String> roleNames);

  @Query("SELECT u FROM User u WHERE " +
         "LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
         "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))")
  org.springframework.data.domain.Page<User> searchUsers(@Param("search") String search, org.springframework.data.domain.Pageable pageable);

  @Query("""
      SELECT 
          COUNT(u),
          COUNT(CASE WHEN u.isActive = true THEN 1 END),
          COUNT(CASE WHEN u.isActive = false THEN 1 END),
          COUNT(CASE WHEN u.role.name IN ('SUPPORT_AGENT', 'SUPPORT_MANAGER', 'AGENT') THEN 1 END)
      FROM User u
  """)
  Object[] countUserSummary();

  boolean existsByRole_RoleId(Long roleId);
}
