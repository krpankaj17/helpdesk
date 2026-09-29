package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification,Long> {
}
