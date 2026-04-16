package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull AccountStatus status
) {
}
