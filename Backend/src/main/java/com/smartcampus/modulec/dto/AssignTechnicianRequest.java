package com.smartcampus.modulec.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssignTechnicianRequest(
        @NotBlank @Size(max = 80) String technicianId,
        @NotBlank @Size(max = 120) String technicianName,
        @Size(max = 120) String actorName
) {
}
