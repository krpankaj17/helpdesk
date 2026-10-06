package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Note;
import com.datansh.HelpDesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
      @Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByTicketIdOrderByCreatedAtAsc(Ticket ticketId);
}
