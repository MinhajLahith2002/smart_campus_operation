package com.smartcampus.operationshub.notifications.dto;

import jakarta.validation.constraints.NotBlank;

public record NotificationQuery(
        String userId,
        @NotBlank String role
) {
}
