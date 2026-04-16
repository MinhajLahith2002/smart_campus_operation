package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.AccountStatus;
import com.smartcampus.modulec.domain.AuthProviderType;
import com.smartcampus.modulec.domain.UserRole;
import java.time.OffsetDateTime;

public record AuthUserResponse(
        String id,
        String fullName,
        String email,
        UserRole role,
        AccountStatus status,
        AuthProviderType authProviderType,
        boolean emailVerified,
        String studentId,
        String faculty,
        String batch,
        String campus,
        String phone,
        OffsetDateTime createdAt
) {
}
