package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Attachment;
import com.datansh.HelpDesk.entity.Comment;
import com.datansh.HelpDesk.entity.Note;
import com.datansh.HelpDesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
           @Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByCommentId(Comment commentId);

    List<Attachment> findByNoteId(Note noteId);

    List<Attachment> findByTicketId(Ticket ticketId);

    List<Attachment> findByTicketIdAndCommentIdIsNullAndNoteIdIsNull(Ticket ticketId);

    List<Attachment> findByTicketIdInAndCommentIdIsNullAndNoteIdIsNull(List<Ticket> tickets);

    List<Attachment> findByCommentIdIn(List<Comment> comments);

    List<Attachment> findByNoteIdIn(List<Note> notes);
}
