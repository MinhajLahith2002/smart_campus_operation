package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.TicketStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateTicketStatusRequest(
        @NotNull TicketStatus status,
        @Size(max = 2000) String resolutionNotes,
        @Size(max = 120) String actorName,
        @Size(max = 2000) String detail
) {
}
