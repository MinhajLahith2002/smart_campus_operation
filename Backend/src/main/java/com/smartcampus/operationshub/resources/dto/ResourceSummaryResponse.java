package com.smartcampus.operationshub.resources.dto;

public record ResourceSummaryResponse(
        long totalResources,
        long activeResources,
        long outOfServiceResources,
        long bookableResources
) {
}
