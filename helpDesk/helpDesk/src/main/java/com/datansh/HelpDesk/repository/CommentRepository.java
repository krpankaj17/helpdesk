package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment,Long> {
}
