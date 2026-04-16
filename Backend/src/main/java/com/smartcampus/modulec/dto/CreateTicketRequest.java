package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.TicketCategory;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateTicketRequest(
        @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String description,
        @NotNull TicketCategory category,
        @NotNull TicketPriority priority,
        @NotBlank @Size(max = 80) String reporterId,
        @NotBlank @Size(max = 120) String reporterName,
        @NotBlank @Email @Size(max = 120) String reporterEmail,
        @NotNull UserRole reporterRole,
        @NotBlank @Size(max = 120) String resourceName,
        @NotBlank @Size(max = 160) String resourceLocation,
        @NotBlank @Size(max = 200) String incidentLocation,
        Long relatedBookingId,
        @Size(max = 200) String relatedBookingLabel,
        @Size(max = 120) String resourceType,
        @Size(max = 120) String preferredContact,
        @Size(max = 120) String operationalImpact,
        @Size(max = 2000) String evidenceNotes,
        List<@Size(max = 255) String> evidenceLabels
) {
}
