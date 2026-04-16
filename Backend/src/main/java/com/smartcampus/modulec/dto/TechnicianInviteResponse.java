package com.smartcampus.modulec.dto;

import java.time.OffsetDateTime;

public record TechnicianInviteResponse(
        Long id,
        String email,
        String fullName,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime expiresAt,
        OffsetDateTime acceptedAt
) {
}
