package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.UserRole;
import java.time.OffsetDateTime;

public record InviteDetailsResponse(
        String email,
        String fullName,
        UserRole role,
        String status,
        OffsetDateTime expiresAt
) {
}
