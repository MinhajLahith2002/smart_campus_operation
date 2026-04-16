package com.smartcampus.operationshub.bookings.dto;

import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.operationshub.bookings.domain.BookingStatus;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record BookingResponse(
        Long id,
        Long resourceId,
        String resourceName,
        String resourceLocation,
        String requesterId,
        String requesterName,
        String requesterEmail,
        UserRole requesterRole,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        String purpose,
        Integer attendees,
        BookingStatus status,
        String rejectionReason,
        String cancellationRequestNote,
        OffsetDateTime cancellationRequestedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
