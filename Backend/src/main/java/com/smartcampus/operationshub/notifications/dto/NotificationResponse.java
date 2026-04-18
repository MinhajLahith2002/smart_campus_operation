package com.smartcampus.operationshub.notifications.dto;

import com.smartcampus.operationshub.notifications.domain.NotificationType;
import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        String userId,
        String roleScope,
        NotificationType type,
        String title,
        String message,
        String relatedEntityId,
        boolean isRead,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
