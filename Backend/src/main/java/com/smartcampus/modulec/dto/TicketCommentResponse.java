package com.smartcampus.modulec.dto;

import com.smartcampus.operationshub.auth.domain.UserRole;
import java.time.OffsetDateTime;

public record TicketCommentResponse(
        Long id,
        String authorId,
        String authorName,
        UserRole authorRole,
        String body,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean edited,
        boolean deleted
) {
}
