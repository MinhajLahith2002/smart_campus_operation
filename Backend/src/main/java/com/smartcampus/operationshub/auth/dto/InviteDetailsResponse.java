package com.smartcampus.operationshub.auth.dto;

import java.time.OffsetDateTime;

public record InviteDetailsResponse(
        String email,
        String fullName,
        String status,
        OffsetDateTime expiresAt
) {
}
