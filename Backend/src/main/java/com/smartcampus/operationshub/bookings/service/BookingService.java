package com.smartcampus.operationshub.bookings.service;

import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.bookings.domain.BookingActivity;
import com.smartcampus.operationshub.bookings.domain.BookingRecord;
import com.smartcampus.operationshub.bookings.domain.BookingStatus;
import com.smartcampus.operationshub.bookings.dto.BookingActivityResponse;
import com.smartcampus.operationshub.bookings.dto.BookingDecisionRequest;
import com.smartcampus.operationshub.bookings.dto.BookingQuery;
import com.smartcampus.operationshub.bookings.dto.BookingResponse;
import com.smartcampus.operationshub.bookings.dto.BookingSummaryResponse;
import com.smartcampus.operationshub.bookings.dto.CreateBookingRequest;
import com.smartcampus.operationshub.bookings.repository.BookingRecordRepository;
import com.smartcampus.operationshub.notifications.domain.NotificationType;
import com.smartcampus.operationshub.notifications.service.NotificationService;
import com.smartcampus.operationshub.resources.domain.ResourceAsset;
import com.smartcampus.operationshub.resources.domain.ResourceStatus;
import com.smartcampus.operationshub.resources.repository.ResourceAssetRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BookingService {

    private final BookingRecordRepository bookingRecordRepository;
    private final ResourceAssetRepository resourceAssetRepository;
    private final NotificationService notificationService;

    public BookingService(BookingRecordRepository bookingRecordRepository,
                          ResourceAssetRepository resourceAssetRepository,
                          NotificationService notificationService) {
        this.bookingRecordRepository = bookingRecordRepository;
        this.resourceAssetRepository = resourceAssetRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getBookings(BookingQuery query) {
        UserRole requesterRole = UserRole.valueOf(query.requesterRole().toUpperCase());
        validateBookingAccessRole(requesterRole);
        return bookingRecordRepository.findAll().stream()
                .filter(booking -> requesterRole == UserRole.ADMIN || (query.requesterId() != null && query.requesterId().equals(booking.getRequesterId())))
                .filter(booking -> query.status() == null || query.status().isBlank() || "ALL".equalsIgnoreCase(query.status()) || booking.getStatus().name().equalsIgnoreCase(query.status()))
                .sorted(Comparator.comparing(BookingRecord::getCreatedAt).reversed())
                .map(this::map)
                .toList();
    }

    public BookingResponse createBooking(CreateBookingRequest request) {
        ResourceAsset resource = resourceAssetRepository.findById(request.resourceId())
                .orElseThrow(() -> new EntityNotFoundException("Resource " + request.resourceId() + " was not found."));

        validateBookingRequesterRole(request.requesterRole());
        validateBookingRequest(request, resource, null);

        BookingRecord booking = new BookingRecord();
        applyBookingRequest(booking, request, resource);
        booking.setStatus(BookingStatus.PENDING);
        booking.setCreatedAt(OffsetDateTime.now());
        booking.setUpdatedAt(booking.getCreatedAt());

        addActivity(booking, booking.getRequesterName(), booking.getRequesterRole(), "BOOKING_CREATED",
                "Booking request submitted for " + booking.getResourceName() + ".");

        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Request Submitted",
                "Your request for " + saved.getResourceName() + " is pending administrative review.",
                String.valueOf(saved.getId()));
        notificationService.publish(null, UserRole.ADMIN.name(), NotificationType.BOOKING_STATUS,
                "Pending Approval Queue",
                "A new booking request for " + saved.getResourceName() + " is waiting for review.",
                String.valueOf(saved.getId()));
        return map(saved);
    }

    public BookingResponse updateBooking(@NonNull Long bookingId, CreateBookingRequest request) {
        BookingRecord booking = findBooking(bookingId);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be edited before admin review.");
        }
        if (!isWithin24Hours(booking)) {
            throw new IllegalArgumentException("Bookings can only be edited within 24 hours of creation.");
        }
        if (request.requesterRole() != booking.getRequesterRole() || !booking.getRequesterId().equals(request.requesterId())) {
            throw new SecurityException("Only the original requester can edit this pending booking.");
        }

        ResourceAsset resource = resourceAssetRepository.findById(request.resourceId())
                .orElseThrow(() -> new EntityNotFoundException("Resource " + request.resourceId() + " was not found."));
        validateBookingRequest(request, resource, bookingId);

        applyBookingRequest(booking, request, resource);
        booking.setUpdatedAt(OffsetDateTime.now());
        booking.setCancellationRequestNote(null);
        booking.setCancellationRequestedAt(null);

        addActivity(booking, booking.getRequesterName(), booking.getRequesterRole(), "BOOKING_UPDATED",
                "Pending booking request details were updated by the requester.");

        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Request Updated",
                "Your pending booking for " + saved.getResourceName() + " was updated before admin review.",
                String.valueOf(saved.getId()));
        notificationService.publish(null, UserRole.ADMIN.name(), NotificationType.BOOKING_STATUS,
                "Booking Request Updated",
                saved.getRequesterName() + " updated the pending booking for " + saved.getResourceName() + ".",
                String.valueOf(saved.getId()));
        return map(saved);
    }

    public BookingResponse approveBooking(@NonNull Long bookingId, BookingDecisionRequest request) {
        BookingRecord booking = findBooking(bookingId);
        ensureAdmin(request.actorRole());
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be approved.");
        }
        ensureNoApprovedConflict(booking, bookingId);
        booking.setStatus(BookingStatus.APPROVED);
        booking.setRejectionReason(null);
        booking.setCancellationRequestNote(null);
        booking.setCancellationRequestedAt(null);
        booking.setUpdatedAt(OffsetDateTime.now());

        addActivity(booking, request.actorName(), request.actorRole(), "BOOKING_APPROVED",
                request.note() != null ? request.note() : "Booking request approved by administration.");

        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Approved",
                "Your booking for " + saved.getResourceName() + " has been approved.",
                String.valueOf(saved.getId()));
        return map(saved);
    }

    public BookingResponse rejectBooking(@NonNull Long bookingId, BookingDecisionRequest request) {
        BookingRecord booking = findBooking(bookingId);
        ensureAdmin(request.actorRole());
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be rejected.");
        }
        if (request.note() == null || request.note().trim().length() < 8) {
            throw new IllegalArgumentException("A clear rejection reason is required.");
        }
        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(request.note().trim());
        booking.setCancellationRequestNote(null);
        booking.setCancellationRequestedAt(null);
        booking.setUpdatedAt(OffsetDateTime.now());

        addActivity(booking, request.actorName(), request.actorRole(), "BOOKING_REJECTED",
                "Rejected: " + booking.getRejectionReason());

        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Rejected",
                "Your booking for " + saved.getResourceName() + " was rejected: " + saved.getRejectionReason(),
                String.valueOf(saved.getId()));
        return map(saved);
    }

    public BookingResponse cancelBooking(@NonNull Long bookingId, BookingDecisionRequest request) {
        BookingRecord booking = findBooking(bookingId);
        if (request.actorRole() != UserRole.ADMIN && !booking.getRequesterId().equals(request.actorId())) {
            throw new SecurityException("Only the requester or an admin can cancel this booking.");
        }

        if (request.actorRole() == UserRole.ADMIN) {
            if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
                throw new IllegalArgumentException("Admins can only cancel pending or approved bookings.");
            }
        } else {
            throw new SecurityException("Direct cancellation is no longer permitted for requesters. Please use 'Request Cancellation' with a reason.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setUpdatedAt(OffsetDateTime.now());
        booking.setCancellationRequestNote(null);
        booking.setCancellationRequestedAt(null);

        addActivity(booking, request.actorName(), request.actorRole(), "BOOKING_CANCELLED",
                request.note() != null ? request.note() : "Booking cancelled.");

        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Cancelled",
                "The booking request for " + saved.getResourceName() + " has been cancelled.",
                String.valueOf(saved.getId()));
        return map(saved);
    }

    public BookingResponse requestCancellation(@NonNull Long bookingId, BookingDecisionRequest request) {
        BookingRecord booking = findBooking(bookingId);
        if (!booking.getRequesterId().equals(request.actorId()) || request.actorRole() != booking.getRequesterRole()) {
            throw new SecurityException("Only the original requester can ask admin to cancel an approved booking.");
        }
        if (booking.getStatus() != BookingStatus.APPROVED && booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only approved or pending bookings can send a cancellation request.");
        }
        if (!isWithin24Hours(booking)) {
            throw new IllegalArgumentException("Cancellation requests can only be sent within 24 hours of booking creation.");
        }
        if (request.note() == null || request.note().trim().length() < 8) {
            throw new IllegalArgumentException("A clear cancellation request message is required.");
        }

        booking.setCancellationRequestNote(request.note().trim());
        booking.setCancellationRequestedAt(OffsetDateTime.now());
        booking.setUpdatedAt(booking.getCancellationRequestedAt());

        addActivity(booking, booking.getRequesterName(), booking.getRequesterRole(), "CANCELLATION_REQUESTED",
                "Requester requested cancellation: " + booking.getCancellationRequestNote());

        BookingRecord saved = bookingRecordRepository.save(booking);

        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Cancellation Request Sent",
                "Your cancellation request for " + saved.getResourceName() + " was sent to admin review.",
                String.valueOf(saved.getId()));
        notificationService.publish(null, UserRole.ADMIN.name(), NotificationType.BOOKING_STATUS,
                "Approved Booking Needs Cancellation Review",
                saved.getRequesterName() + " requested admin cancellation for " + saved.getResourceName() + ": " + saved.getCancellationRequestNote(),
                String.valueOf(saved.getId()));
        return map(saved);
    }

    @Transactional(readOnly = true)
    public BookingSummaryResponse getSummary() {
        return new BookingSummaryResponse(
                bookingRecordRepository.count(),
                bookingRecordRepository.countByStatus(BookingStatus.PENDING),
                bookingRecordRepository.countByStatus(BookingStatus.APPROVED),
                bookingRecordRepository.countByStatus(BookingStatus.REJECTED),
                bookingRecordRepository.countByStatus(BookingStatus.CANCELLED),
                bookingRecordRepository.countByCancellationRequestedAtIsNotNull()
        );
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingResponse(@NonNull Long bookingId) {
        return map(findBooking(bookingId));
    }

    private boolean isWithin24Hours(BookingRecord booking) {
        return OffsetDateTime.now().isBefore(booking.getCreatedAt().plusHours(24));
    }

    private BookingRecord findBooking(@NonNull Long bookingId) {
        return bookingRecordRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking " + bookingId + " was not found."));
    }

    private void validateBookingRequesterRole(UserRole requesterRole) {
        if (requesterRole != UserRole.STUDENT && requesterRole != UserRole.STAFF) {
            throw new SecurityException("Only student or staff requester accounts can create booking requests.");
        }
    }

    private void validateBookingAccessRole(UserRole requesterRole) {
        if (requesterRole == UserRole.TECHNICIAN) {
            throw new SecurityException("Technician accounts do not have access to the booking module.");
        }
    }

    private void validateBookingRequest(CreateBookingRequest request, ResourceAsset resource, Long bookingId) {
        if (request.endTime().isBefore(request.startTime()) || request.endTime().equals(request.startTime())) {
            throw new IllegalArgumentException("End time must be after start time.");
        }
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new IllegalArgumentException("This resource is currently unavailable for booking.");
        }
        if (request.attendees() > resource.getCapacity()) {
            throw new IllegalArgumentException("Attendee count exceeds resource capacity.");
        }
        if (request.startTime().isBefore(resource.getAvailableFrom()) || request.endTime().isAfter(resource.getAvailableTo())) {
            throw new IllegalArgumentException("Booking must fit within the resource availability window.");
        }
        ensureNoActiveConflict(request.resourceId(), request.date(), request.startTime(), request.endTime(), bookingId);
    }

    private void ensureNoApprovedConflict(BookingRecord booking, Long bookingId) {
        ensureNoApprovedConflict(booking.getResourceId(), booking.getBookingDate(), booking.getStartTime(), booking.getEndTime(), bookingId);
    }

    private void ensureNoApprovedConflict(@NonNull Long resourceId, java.time.LocalDate date, LocalTime startTime, LocalTime endTime, Long bookingId) {
        boolean hasConflict = bookingRecordRepository.findByBookingDateAndResourceId(date, resourceId).stream()
                .filter(existing -> bookingId == null || !existing.getId().equals(bookingId))
                .filter(existing -> existing.getStatus() == BookingStatus.APPROVED)
                .anyMatch(existing -> startTime.isBefore(existing.getEndTime()) && endTime.isAfter(existing.getStartTime()));
        if (hasConflict) {
            throw new IllegalArgumentException("This booking conflicts with an already approved reservation for the same resource and time.");
        }
    }

    private void ensureNoActiveConflict(@NonNull Long resourceId, java.time.LocalDate date, LocalTime startTime, LocalTime endTime, Long bookingId) {
        BookingRecord conflictingBooking = bookingRecordRepository.findByBookingDateAndResourceId(date, resourceId).stream()
                .filter(existing -> bookingId == null || !existing.getId().equals(bookingId))
                .filter(existing -> existing.getStatus() == BookingStatus.PENDING || existing.getStatus() == BookingStatus.APPROVED)
                .filter(existing -> startTime.isBefore(existing.getEndTime()) && endTime.isAfter(existing.getStartTime()))
                .findFirst()
                .orElse(null);

        if (conflictingBooking != null) {
            throw new IllegalArgumentException(
                    "This slot is already reserved or waiting for approval for another booking on "
                            + date
                            + " from "
                            + conflictingBooking.getStartTime()
                            + " to "
                            + conflictingBooking.getEndTime()
                            + ". Please choose a different time."
            );
        }
    }

    private void ensureAdmin(UserRole role) {
        if (role != UserRole.ADMIN) {
            throw new SecurityException("Only admins can make this booking decision.");
        }
    }

    private void applyBookingRequest(BookingRecord booking, CreateBookingRequest request, ResourceAsset resource) {
        booking.setResourceId(resource.getId());
        booking.setResourceName(resource.getName());
        booking.setResourceLocation(resource.getLocation());
        booking.setRequesterId(request.requesterId().trim());
        booking.setRequesterName(request.requesterName().trim());
        booking.setRequesterEmail(request.requesterEmail().trim());
        booking.setRequesterRole(request.requesterRole());
        booking.setBookingDate(request.date());
        booking.setStartTime(request.startTime());
        booking.setEndTime(request.endTime());
        booking.setPurpose(request.purpose().trim());
        booking.setAttendees(request.attendees());
    }

    private void addActivity(BookingRecord booking, String actorName, UserRole actorRole, String action, String detail) {
        BookingActivity activity = new BookingActivity();
        activity.setBooking(booking);
        activity.setActorName(actorName != null ? actorName.trim() : "System");
        activity.setActorRole(actorRole);
        activity.setAction(action);
        activity.setDetail(detail);
        activity.setCreatedAt(OffsetDateTime.now());
        booking.getActivities().add(activity);
    }

    private BookingResponse map(BookingRecord booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getResourceId(),
                booking.getResourceName(),
                booking.getResourceLocation(),
                booking.getRequesterId(),
                booking.getRequesterName(),
                booking.getRequesterEmail(),
                booking.getRequesterRole(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getPurpose(),
                booking.getAttendees(),
                booking.getStatus(),
                booking.getRejectionReason(),
                booking.getCancellationRequestNote(),
                booking.getCancellationRequestedAt(),
                booking.getCreatedAt(),
                booking.getUpdatedAt(),
                booking.getActivities().stream()
                        .map(a -> new BookingActivityResponse(a.getId(), a.getActorName(), a.getActorRole(), a.getAction(), a.getDetail(), a.getCreatedAt()))
                        .toList()
        );
    }
}

