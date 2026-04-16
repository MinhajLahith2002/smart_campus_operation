package com.smartcampus.operationshub.config;

import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.operationshub.bookings.domain.BookingRecord;
import com.smartcampus.operationshub.bookings.domain.BookingStatus;
import com.smartcampus.operationshub.bookings.repository.BookingRecordRepository;
import com.smartcampus.operationshub.notifications.domain.NotificationType;
import com.smartcampus.operationshub.notifications.repository.NotificationEventRepository;
import com.smartcampus.operationshub.notifications.service.NotificationService;
import com.smartcampus.operationshub.resources.domain.ResourceAsset;
import com.smartcampus.operationshub.resources.domain.ResourceStatus;
import com.smartcampus.operationshub.resources.domain.ResourceType;
import com.smartcampus.operationshub.resources.repository.ResourceAssetRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Objects;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;

@Configuration
public class OperationsSeedConfig {

    private static final String MAIN_AUDITORIUM_LOCATION = "Building B, Floor 1";

    @Bean
    CommandLineRunner seedOperationsData(ResourceAssetRepository resourceAssetRepository,
                                         BookingRecordRepository bookingRecordRepository,
                                         NotificationEventRepository notificationEventRepository,
                                         NotificationService notificationService) {
        return args -> {
            if (resourceAssetRepository.count() == 0) {
                resourceAssetRepository.save(Objects.requireNonNull(resource("RES-001", "Main Auditorium", ResourceType.LECTURE_HALL, 500, MAIN_AUDITORIUM_LOCATION,
                        "Large auditorium with state-of-the-art audio/visual equipment.", ResourceStatus.ACTIVE,
                        LocalTime.of(8, 0), LocalTime.of(22, 0),
                        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800", 91)));
                resourceAssetRepository.save(Objects.requireNonNull(resource("RES-002", "Advanced Robotics Lab", ResourceType.LAB, 30, "Science Wing, Room 302",
                        "Equipped with robotic arms and high-performance workstations.", ResourceStatus.ACTIVE,
                        LocalTime.of(9, 0), LocalTime.of(18, 0),
                        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800", 84)));
                resourceAssetRepository.save(Objects.requireNonNull(resource("RES-003", "Collaborative Space 1", ResourceType.MEETING_ROOM, 12, "Library, Level 2",
                        "Perfect for group discussions and project planning.", ResourceStatus.ACTIVE,
                        LocalTime.of(7, 0), LocalTime.of(23, 0),
                        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800", 88)));
                resourceAssetRepository.save(Objects.requireNonNull(resource("RES-004", "4K Projector Unit B", ResourceType.EQUIPMENT, 1, "IT Helpdesk",
                        "Portable high-resolution projector for presentations.", ResourceStatus.OUT_OF_SERVICE,
                        LocalTime.of(8, 0), LocalTime.of(17, 0),
                        "https://images.unsplash.com/photo-1535016120720-40c646bebb3d?auto=format&fit=crop&q=80&w=800", 58)));
            }

            resourceAssetRepository.findAll().stream()
                    .filter(resource -> "Main Auditorium".equals(resource.getName()))
                    .filter(resource -> !MAIN_AUDITORIUM_LOCATION.equals(resource.getLocation()))
                    .forEach(resource -> {
                        resource.setLocation(MAIN_AUDITORIUM_LOCATION);
                        resourceAssetRepository.save(resource);
                    });

            if (bookingRecordRepository.count() == 0) {
                var resources = resourceAssetRepository.findAll();
                BookingRecord approved = booking(resources.get(0), "student-01", "Amaya Perera", "student@campus.edu", UserRole.STUDENT,
                        LocalDate.now().plusDays(2), LocalTime.of(10, 0), LocalTime.of(12, 0), "Guest Lecture: Future of AI", 350, BookingStatus.APPROVED, null);
                BookingRecord pending = booking(resources.get(2), "student-01", "Amaya Perera", "student@campus.edu", UserRole.STUDENT,
                        LocalDate.now().plusDays(4), LocalTime.of(14, 0), LocalTime.of(16, 0), "Study Group", 8, BookingStatus.PENDING, null);
                BookingRecord adminPending = booking(resources.get(1), "staff-07", "Lahiru Fernando", "labassistant@campus.edu", UserRole.STAFF,
                        LocalDate.now().plusDays(5), LocalTime.of(9, 0), LocalTime.of(11, 0), "Embedded Systems Practical Assessment", 24, BookingStatus.PENDING, null);
                BookingRecord rejected = booking(resources.get(0), "events-02", "Campus Events Desk", "events@campus.edu", UserRole.STAFF,
                        LocalDate.now().plusDays(6), LocalTime.of(13, 0), LocalTime.of(15, 0), "Interfaculty Innovation Forum", 280, BookingStatus.REJECTED,
                        "Conflicts with a pre-approved university event in the same slot.");
                bookingRecordRepository.save(Objects.requireNonNull(approved));
                bookingRecordRepository.save(Objects.requireNonNull(pending));
                bookingRecordRepository.save(Objects.requireNonNull(adminPending));
                bookingRecordRepository.save(Objects.requireNonNull(rejected));
            }

            bookingRecordRepository.findAll().stream()
                    .filter(booking -> "Main Auditorium".equals(booking.getResourceName()))
                    .filter(booking -> !MAIN_AUDITORIUM_LOCATION.equals(booking.getResourceLocation()))
                    .forEach(booking -> {
                        booking.setResourceLocation(MAIN_AUDITORIUM_LOCATION);
                        bookingRecordRepository.save(booking);
                    });

            if (notificationEventRepository.count() == 0) {
                notificationService.publish("student-01", "USER", NotificationType.BOOKING_STATUS,
                        "Booking Approved",
                        "Your booking for Main Auditorium has been approved.",
                        "1");
                notificationService.publish("student-01", "USER", NotificationType.TICKET_STATUS,
                        "Technician Assigned",
                        "A technician has been assigned to inspect Projector Unit B.",
                        "1");
                notificationService.publish("admin-1", "ADMIN", NotificationType.BOOKING_STATUS,
                        "Pending Approval Queue",
                        "Two new booking requests are waiting for administrative review.",
                        "2");
                notificationService.publish("tech-17", "TECHNICIAN", NotificationType.RESOURCE_STATUS,
                        "High Priority Asset Alert",
                        "Main Auditorium network stability issue requires technician attention.",
                        "3");
            }
        };
    }

    private @NonNull ResourceAsset resource(String code, String name, ResourceType type, int capacity, String location,
                                   String description, ResourceStatus status, LocalTime from, LocalTime to,
                                   String imageUrl, int healthScore) {
        ResourceAsset resource = new ResourceAsset();
        resource.setCode(code);
        resource.setName(name);
        resource.setType(type);
        resource.setCapacity(capacity);
        resource.setLocation(location);
        resource.setDescription(description);
        resource.setStatus(status);
        resource.setAvailableFrom(from);
        resource.setAvailableTo(to);
        resource.setImageUrl(imageUrl);
        resource.setHealthScore(healthScore);
        return resource;
    }

    private @NonNull BookingRecord booking(@NonNull ResourceAsset resource, String requesterId, String requesterName, String requesterEmail,
                                  UserRole role, LocalDate date, LocalTime start, LocalTime end,
                                  String purpose, int attendees, BookingStatus status, String rejectionReason) {
        BookingRecord booking = new BookingRecord();
        booking.setResourceId(resource.getId());
        booking.setResourceName(resource.getName());
        booking.setResourceLocation(resource.getLocation());
        booking.setRequesterId(requesterId);
        booking.setRequesterName(requesterName);
        booking.setRequesterEmail(requesterEmail);
        booking.setRequesterRole(role);
        booking.setBookingDate(date);
        booking.setStartTime(start);
        booking.setEndTime(end);
        booking.setPurpose(purpose);
        booking.setAttendees(attendees);
        booking.setStatus(status);
        booking.setRejectionReason(rejectionReason);
        booking.setCreatedAt(OffsetDateTime.now().minusDays(2));
        booking.setUpdatedAt(OffsetDateTime.now());
        return booking;
    }
}
