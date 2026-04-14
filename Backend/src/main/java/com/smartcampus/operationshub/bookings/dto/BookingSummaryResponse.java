package com.smartcampus.operationshub.bookings.dto;

public record BookingSummaryResponse(
        long total,
        long pending,
        long approved,
        long rejected,
        long cancelled
) {
}
