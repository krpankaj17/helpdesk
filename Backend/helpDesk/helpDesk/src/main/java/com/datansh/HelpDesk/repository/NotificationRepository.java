package com.datansh.HelpDesk.repository;

import com.datansh.HelpDesk.entity.Notification;
import com.datansh.HelpDesk.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
      @Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    Page<Notification> findByUserAndIsReadFalseOrderByCreatedAtDesc(User user, Pageable pageable);

    long countByUserAndIsReadFalse(User user);

    Optional<Notification> findByNotificationIdAndUser(Long notificationId, User user);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user = :user AND n.isRead = false")
    int markAllAsReadForUser(@Param("user") User user);

    void deleteByNotificationIdAndUser(Long notificationId, User user);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user = :user")
    int deleteAllByUser(@Param("user") User user);
}
