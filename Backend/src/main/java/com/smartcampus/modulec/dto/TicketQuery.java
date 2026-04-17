package com.smartcampus.modulec.dto;

import com.smartcampus.operationshub.auth.domain.UserRole;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TicketQuery(
        String status,
        String priority,
        String category,
        @Size(max = 80) String requesterId,
        @NotNull UserRole requesterRole,
        String assignedToMe
) {
}
