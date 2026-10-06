package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User,Long> {
  Optional<User> findByUserPublicId(UUID userPublicId);

  @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
  Optional<User> findByEmail(@Param("email") String email);

  Optional<User> findByEmailIgnoreCase(String email);

  Optional<User> findFirstByName(String name);

  @Query("SELECT u FROM User u WHERE u.role.name IN :roleNames")
  List<User> findByRoleNames(@Param("roleNames") List<String> roleNames);

  boolean existsByRole_RoleId(Long roleId);
}
