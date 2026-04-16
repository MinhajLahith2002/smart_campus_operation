package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.ResourceStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateFacilityAssetStatusRequest(@NotNull ResourceStatus status) {
}
