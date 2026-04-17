package com.smartcampus.modulec.dto;

import java.time.OffsetDateTime;

public record ApiErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String message,
        Object details
) {
}
