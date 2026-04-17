package com.smartcampus.operationshub.notifications.repository;

import com.smartcampus.operationshub.notifications.domain.NotificationEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, Long> {
    List<NotificationEvent> findByUserIdOrderByCreatedAtDesc(String userId);
    List<NotificationEvent> findByRoleScopeOrderByCreatedAtDesc(String roleScope);
    List<NotificationEvent> findByUserIdOrRoleScopeOrderByCreatedAtDesc(String userId, String roleScope);
}
