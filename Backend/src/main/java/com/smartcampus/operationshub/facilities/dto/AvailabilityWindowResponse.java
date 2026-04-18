package com.smartcampus.operationshub.facilities.dto;

import java.util.List;

public record AvailabilityWindowResponse(
        List<String> daysOfWeek,
        String openTime,
        String closeTime,
        String notes
) {
}
