package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttachmentRepository extends JpaRepository<Attachment,Long> {
}
