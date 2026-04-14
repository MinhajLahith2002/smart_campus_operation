package com.smartcampus.operationshub.notifications.dto;

public record NotificationSummaryResponse(
        long total,
        long unread,
        long bookingSignals,
        long ticketSignals
) {
}
