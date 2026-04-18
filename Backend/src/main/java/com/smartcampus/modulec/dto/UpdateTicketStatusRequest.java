package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.operationshub.auth.domain.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateTicketStatusRequest(
        @NotNull TicketStatus status,
        @Size(max = 2000) String resolutionNotes,
        @NotBlank @Size(max = 80) String actorId,
        @Size(max = 120) String actorName,
        @NotNull UserRole actorRole,
        @Size(max = 2000) String detail
) {
}