package com.smartcampus.operationshub.auth.dto;

import com.smartcampus.operationshub.auth.domain.UserRole;
import java.time.OffsetDateTime;

public record InviteDetailsResponse(
        String email,
        String fullName,
        UserRole role,
        String status,
        OffsetDateTime expiresAt
) {
}
