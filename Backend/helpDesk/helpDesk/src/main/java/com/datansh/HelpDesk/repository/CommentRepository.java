package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Comment;
import com.datansh.HelpDesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
      @Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTicketIdOrderByCreatedAtAsc(Ticket ticketId);
}
