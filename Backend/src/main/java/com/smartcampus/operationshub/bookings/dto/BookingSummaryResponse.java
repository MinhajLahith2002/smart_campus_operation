package com.smartcampus.operationshub.bookings.dto;

import com.smartcampus.operationshub.bookings.domain.BookingStatus;

public record BookingSummaryResponse(
        long total,
        long pending,
        long approved,
        long rejected,
        long cancelled,
        long cancellationRequests
) {
}
