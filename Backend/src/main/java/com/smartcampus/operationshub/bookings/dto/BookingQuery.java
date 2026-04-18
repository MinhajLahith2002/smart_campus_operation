package com.smartcampus.operationshub.bookings.dto;

import jakarta.validation.constraints.NotBlank;

public record BookingQuery(
        String requesterId,
        @NotBlank String requesterRole,
        String status
) {
}
