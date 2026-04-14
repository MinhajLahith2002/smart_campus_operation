package com.smartcampus.operationshub.notifications.controller;

import com.smartcampus.operationshub.notifications.dto.NotificationResponse;
import com.smartcampus.operationshub.notifications.dto.NotificationSummaryResponse;
import com.smartcampus.operationshub.notifications.service.NotificationService;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> getNotifications(@RequestParam(required = false) String userId,
                                                       @RequestParam @NotBlank String role) {
        return notificationService.getNotifications(userId, role);
    }

    @GetMapping("/summary")
    public NotificationSummaryResponse getSummary(@RequestParam(required = false) String userId,
                                                  @RequestParam @NotBlank String role) {
        return notificationService.getSummary(userId, role);
    }

    @PatchMapping("/{notificationId}/read")
    public NotificationResponse markRead(@PathVariable Long notificationId) {
        return notificationService.markRead(notificationId);
    }

    @PatchMapping("/read-all")
    public void markAllRead(@RequestParam(required = false) String userId,
                            @RequestParam @NotBlank String role) {
        notificationService.markAllRead(userId, role);
    }
}
