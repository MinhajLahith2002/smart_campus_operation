package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.TicketCategory;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.domain.UserRole;
import java.time.OffsetDateTime;
import java.util.List;

public record TicketResponse(
        Long id,
        String title,
        String description,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        String reporterId,
        String reporterName,
        String reporterEmail,
        UserRole reporterRole,
        String assignedTechnicianId,
        String assignedTechnicianName,
        String resourceName,
        String resourceLocation,
        String resourceType,
        String preferredContact,
        String operationalImpact,
        String evidenceNotes,
        String resolutionNotes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<String> evidenceLabels,
        List<TicketActivityResponse> activities,
        List<TicketCommentResponse> comments,
        Long similarOpenIncidents,
        Integer completenessScore,
        Integer smartPriorityScore,
        String smartPriorityLabel,
        String responseTarget
) {
}
