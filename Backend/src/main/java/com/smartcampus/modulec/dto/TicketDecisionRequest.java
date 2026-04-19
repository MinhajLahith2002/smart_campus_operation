package com.smartcampus.modulec.dto;

import com.smartcampus.operationshub.auth.domain.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TicketDecisionRequest(
        @NotBlank @Size(max = 80) String actorId,
        @Size(max = 120) String actorName,
        @NotNull UserRole actorRole,
        @Size(max = 2000) String note,
        List<@Size(max = 255) String> evidenceLabels,
        @Size(max = 255) String evidenceLabel,
        String evidenceDataUrl
) {
}
