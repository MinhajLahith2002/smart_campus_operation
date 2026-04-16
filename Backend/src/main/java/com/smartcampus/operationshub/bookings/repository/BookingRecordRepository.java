package com.smartcampus.operationshub.bookings.repository;

import com.smartcampus.operationshub.bookings.domain.BookingRecord;
import com.smartcampus.operationshub.bookings.domain.BookingStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRecordRepository extends JpaRepository<BookingRecord, Long> {
    List<BookingRecord> findByRequesterIdOrderByCreatedAtDesc(String requesterId);
    List<BookingRecord> findByBookingDateAndResourceId(LocalDate bookingDate, Long resourceId);
    long countByStatus(BookingStatus status);
    long countByCancellationRequestedAtIsNotNull();
}
