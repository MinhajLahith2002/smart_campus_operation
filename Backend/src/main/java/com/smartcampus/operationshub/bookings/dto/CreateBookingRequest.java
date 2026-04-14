package com.smartcampus.operationshub.bookings.dto;

import com.smartcampus.modulec.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

public record CreateBookingRequest(
        @NotNull Long resourceId,
        @NotBlank @Size(max = 120) String requesterId,
        @NotBlank @Size(max = 120) String requesterName,
        @NotBlank @Email String requesterEmail,
        @NotNull UserRole requesterRole,
        @NotNull @FutureOrPresent LocalDate date,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotBlank @Size(min = 12, max = 500) String purpose,
        @NotNull @Min(1) @Max(5000) Integer attendees
) {
}
