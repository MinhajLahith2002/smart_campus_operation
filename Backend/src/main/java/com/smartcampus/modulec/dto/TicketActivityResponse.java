package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.UserRole;
import java.time.OffsetDateTime;

public record TicketActivityResponse(
        Long id,
        String actorName,
        UserRole actorRole,
        String action,
        String detail,
        OffsetDateTime createdAt
) {
}
