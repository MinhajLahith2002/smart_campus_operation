package com.smartcampus.operationshub.bookings.service;

import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.operationshub.bookings.domain.BookingRecord;
import com.smartcampus.operationshub.bookings.domain.BookingStatus;
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

        validateBookingRequest(request, resource);

        BookingRecord booking = new BookingRecord();
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
        booking.setStatus(BookingStatus.PENDING);
        booking.setCreatedAt(OffsetDateTime.now());
        booking.setUpdatedAt(booking.getCreatedAt());

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

    public BookingResponse approveBooking(Long bookingId, BookingDecisionRequest request) {
        BookingRecord booking = findBooking(bookingId);
        ensureAdmin(request.actorRole());
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be approved.");
        }
        ensureNoApprovedConflict(booking, bookingId);
        booking.setStatus(BookingStatus.APPROVED);
        booking.setRejectionReason(null);
        booking.setUpdatedAt(OffsetDateTime.now());
        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Approved",
                "Your booking for " + saved.getResourceName() + " has been approved.",
                String.valueOf(saved.getId()));
        return map(saved);
    }

    public BookingResponse rejectBooking(Long bookingId, BookingDecisionRequest request) {
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
        booking.setUpdatedAt(OffsetDateTime.now());
        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Rejected",
                "Your booking for " + saved.getResourceName() + " was rejected: " + saved.getRejectionReason(),
                String.valueOf(saved.getId()));
        return map(saved);
    }

    public BookingResponse cancelBooking(Long bookingId, BookingDecisionRequest request) {
        BookingRecord booking = findBooking(bookingId);
        if (request.actorRole() != UserRole.ADMIN && !booking.getRequesterId().equals(request.actorId())) {
            throw new SecurityException("Only the requester or an admin can cancel this booking.");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be cancelled in this demo workflow.");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setUpdatedAt(OffsetDateTime.now());
        BookingRecord saved = bookingRecordRepository.save(booking);
        notificationService.publish(saved.getRequesterId(), saved.getRequesterRole().name(), NotificationType.BOOKING_STATUS,
                "Booking Cancelled",
                "The booking request for " + saved.getResourceName() + " has been cancelled.",
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
                bookingRecordRepository.countByStatus(BookingStatus.CANCELLED)
        );
    }

    private BookingRecord findBooking(Long bookingId) {
        return bookingRecordRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking " + bookingId + " was not found."));
    }

    private void validateBookingRequest(CreateBookingRequest request, ResourceAsset resource) {
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
        ensureNoApprovedConflict(request.resourceId(), request.date(), request.startTime(), request.endTime(), null);
    }

    private void ensureNoApprovedConflict(BookingRecord booking, Long bookingId) {
        ensureNoApprovedConflict(booking.getResourceId(), booking.getBookingDate(), booking.getStartTime(), booking.getEndTime(), bookingId);
    }

    private void ensureNoApprovedConflict(Long resourceId, java.time.LocalDate date, LocalTime startTime, LocalTime endTime, Long bookingId) {
        boolean hasConflict = bookingRecordRepository.findByBookingDateAndResourceId(date, resourceId).stream()
                .filter(existing -> bookingId == null || !existing.getId().equals(bookingId))
                .filter(existing -> existing.getStatus() == BookingStatus.APPROVED)
                .anyMatch(existing -> startTime.isBefore(existing.getEndTime()) && endTime.isAfter(existing.getStartTime()));
        if (hasConflict) {
            throw new IllegalArgumentException("This booking conflicts with an existing approved reservation.");
        }
    }

    private void ensureAdmin(UserRole role) {
        if (role != UserRole.ADMIN) {
            throw new SecurityException("Only admins can make this booking decision.");
        }
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
                booking.getCreatedAt(),
                booking.getUpdatedAt()
        );
    }
}
