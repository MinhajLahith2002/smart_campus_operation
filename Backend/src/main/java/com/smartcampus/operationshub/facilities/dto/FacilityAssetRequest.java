package com.smartcampus.operationshub.facilities.dto;

import com.smartcampus.operationshub.facilities.domain.ResourceStatus;
import com.smartcampus.operationshub.facilities.domain.ResourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FacilityAssetRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull ResourceType type,
        @NotNull @Min(0) Integer capacity,
        @NotBlank @Size(max = 160) String location,
        @Size(max = 1000) String description,
        @Size(max = 500) String imageUrl,
        @NotNull ResourceStatus status,
        @NotNull @Valid AvailabilityWindowRequest availabilityWindow
) {
}
