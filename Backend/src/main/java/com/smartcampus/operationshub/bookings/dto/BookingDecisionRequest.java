package com.smartcampus.operationshub.bookings.dto;

import com.smartcampus.modulec.domain.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BookingDecisionRequest(
        @NotBlank String actorId,
        @NotBlank String actorName,
        @NotNull UserRole actorRole,
        @Size(max = 300) String note
) {
}
