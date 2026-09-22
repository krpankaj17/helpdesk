package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;


public interface UserRepository extends JpaRepository<User,Long> {
  User findByUserPublicId(UUID userPublicId);
  Optional<User>  findByEmail(String email) ;
}
