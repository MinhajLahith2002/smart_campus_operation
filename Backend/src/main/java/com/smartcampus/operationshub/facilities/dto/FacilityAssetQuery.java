package com.smartcampus.operationshub.facilities.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record FacilityAssetQuery(
        String type,
        String status,
        @Min(0) Integer capacity,
        @Size(max = 160) String location,
        @Size(max = 120) String search
) {
}
