package com.smartcampus.operationshub.notifications.service;

import com.smartcampus.operationshub.notifications.domain.NotificationEvent;
import com.smartcampus.operationshub.notifications.domain.NotificationType;
import com.smartcampus.operationshub.notifications.dto.NotificationResponse;
import com.smartcampus.operationshub.notifications.dto.NotificationSummaryResponse;
import com.smartcampus.operationshub.notifications.repository.NotificationEventRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificationService {

    private final NotificationEventRepository notificationEventRepository;

    public NotificationService(NotificationEventRepository notificationEventRepository) {
        this.notificationEventRepository = notificationEventRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userId, String role) {
        String normalizedRole = role == null ? null : role.toUpperCase();
        List<NotificationEvent> notifications;
        if (userId != null && !userId.isBlank()) {
            notifications = notificationEventRepository.findByUserIdOrRoleScopeOrderByCreatedAtDesc(userId, normalizedRole);
        } else {
            notifications = notificationEventRepository.findByRoleScopeOrderByCreatedAtDesc(normalizedRole);
        }
        return notifications.stream().sorted(Comparator.comparing(NotificationEvent::getCreatedAt).reversed()).map(this::map).toList();
    }

    public NotificationResponse markRead(@NonNull Long notificationId) {
        NotificationEvent event = notificationEventRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("Notification " + notificationId + " was not found."));
        event.setRead(true);
        event.setUpdatedAt(OffsetDateTime.now());
        return map(notificationEventRepository.save(event));
    }

    public NotificationSummaryResponse getSummary(String userId, String role) {
        List<NotificationResponse> notifications = getNotifications(userId, role);
        return new NotificationSummaryResponse(
                notifications.size(),
                notifications.stream().filter(item -> !item.isRead()).count(),
                notifications.stream().filter(item -> item.type() == NotificationType.BOOKING_STATUS).count(),
                notifications.stream().filter(item -> item.type() != NotificationType.BOOKING_STATUS).count()
        );
    }

    public void markAllRead(String userId, String role) {
        List<NotificationEvent> notifications = userId != null && !userId.isBlank()
                ? notificationEventRepository.findByUserIdOrRoleScopeOrderByCreatedAtDesc(userId, role == null ? null : role.toUpperCase())
                : notificationEventRepository.findByRoleScopeOrderByCreatedAtDesc(role == null ? null : role.toUpperCase());
        notifications.forEach(notification -> {
            notification.setRead(true);
            notification.setUpdatedAt(OffsetDateTime.now());
        });
        notificationEventRepository.saveAll(notifications);
    }

    public NotificationEvent publish(String userId, String roleScope, NotificationType type, String title, String message, String relatedEntityId) {
        NotificationEvent event = new NotificationEvent();
        event.setUserId(userId);
        event.setRoleScope(roleScope == null ? null : roleScope.toUpperCase());
        event.setType(type);
        event.setTitle(title);
        event.setMessage(message);
        event.setRelatedEntityId(relatedEntityId);
        event.setRead(false);
        event.setCreatedAt(OffsetDateTime.now());
        event.setUpdatedAt(event.getCreatedAt());
        return notificationEventRepository.save(event);
    }

    private NotificationResponse map(NotificationEvent event) {
        return new NotificationResponse(
                event.getId(),
                event.getUserId(),
                event.getRoleScope(),
                event.getType(),
                event.getTitle(),
                event.getMessage(),
                event.getRelatedEntityId(),
                event.isRead(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }
}
