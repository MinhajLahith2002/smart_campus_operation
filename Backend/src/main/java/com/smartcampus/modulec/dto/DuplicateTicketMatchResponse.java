package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.TicketStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record DuplicateTicketMatchResponse(
        Long ticketId,
        String title,
        TicketStatus status,
        String resourceName,
        String incidentLocation,
        OffsetDateTime updatedAt,
        Integer matchScore,
        List<String> matchReasons,
        boolean viewable
) {
}
