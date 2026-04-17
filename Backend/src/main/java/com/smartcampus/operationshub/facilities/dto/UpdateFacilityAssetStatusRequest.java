package com.smartcampus.operationshub.facilities.dto;

import com.smartcampus.operationshub.facilities.domain.ResourceStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateFacilityAssetStatusRequest(@NotNull ResourceStatus status) {
}
