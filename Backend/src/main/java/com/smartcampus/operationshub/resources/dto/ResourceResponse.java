package com.smartcampus.operationshub.resources.dto;

import com.smartcampus.operationshub.resources.domain.ResourceStatus;
import com.smartcampus.operationshub.resources.domain.ResourceType;
import java.time.LocalTime;

public record ResourceResponse(
        Long id,
        String code,
        String name,
        ResourceType type,
        Integer capacity,
        String location,
        String description,
        ResourceStatus status,
        LocalTime availableFrom,
        LocalTime availableTo,
        String imageUrl,
        Integer healthScore,
        boolean bookingReady
) {
}
