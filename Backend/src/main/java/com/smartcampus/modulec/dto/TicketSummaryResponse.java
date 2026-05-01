package com.smartcampus.modulec.dto;

public record TicketSummaryResponse(
        long total,
        long open,
        long triaged,
        long assigned,
        long inProgress,
        long resolved,
        long unassigned,
        long highOrCritical
) {
}