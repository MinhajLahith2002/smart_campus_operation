package com.smartcampus.operationshub.auth.dto;

import com.smartcampus.operationshub.auth.domain.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull AccountStatus status
) {
}
