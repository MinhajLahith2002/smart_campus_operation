package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.TicketCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DuplicateTicketCheckRequest(
        @NotBlank @Size(max = 120) String resourceName,
        @NotBlank @Size(max = 160) String resourceLocation,
        @NotBlank @Size(max = 200) String incidentLocation,
        @NotNull TicketCategory category,
        @Size(max = 120) String title,
        @Size(max = 2000) String description,
        @Size(max = 120) String operationalImpact,
        Long excludeTicketId
) {
}
