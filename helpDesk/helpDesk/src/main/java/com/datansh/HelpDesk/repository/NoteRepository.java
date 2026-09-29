package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note,Long> {
}
