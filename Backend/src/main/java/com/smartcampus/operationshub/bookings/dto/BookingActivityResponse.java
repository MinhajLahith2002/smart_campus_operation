package com.smartcampus.operationshub.bookings.dto;

import com.smartcampus.operationshub.auth.domain.UserRole;
import java.time.OffsetDateTime;

public record BookingActivityResponse(
        Long id,
        String actorName,
        UserRole actorRole,
        String action,
        String detail,
        OffsetDateTime createdAt
) {
}
