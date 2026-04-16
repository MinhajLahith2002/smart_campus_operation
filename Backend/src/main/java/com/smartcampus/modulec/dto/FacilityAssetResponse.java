package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.ResourceStatus;
import com.smartcampus.modulec.domain.ResourceType;
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
