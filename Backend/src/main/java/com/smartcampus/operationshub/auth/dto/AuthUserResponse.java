package com.smartcampus.operationshub.auth.dto;

import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.UserRole;
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
