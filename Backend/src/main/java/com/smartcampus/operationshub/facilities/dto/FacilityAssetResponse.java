package com.smartcampus.operationshub.facilities.dto;

import com.smartcampus.operationshub.facilities.domain.ResourceStatus;
import com.smartcampus.operationshub.facilities.domain.ResourceType;
import java.time.OffsetDateTime;

public record FacilityAssetResponse(
        Long id,
        String name,
        ResourceType type,
        Integer capacity,
        String location,
        String description,
        String imageUrl,
        AvailabilityWindowResponse availabilityWindow,
        ResourceStatus status,
        boolean available,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
