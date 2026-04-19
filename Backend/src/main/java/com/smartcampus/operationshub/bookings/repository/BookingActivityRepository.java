/**
 * Tracks all state changes for a booking record
 * @author Aran (Member 2)
 */
package com.smartcampus.operationshub.bookings.repository;

import com.smartcampus.operationshub.bookings.domain.BookingActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingActivityRepository extends JpaRepository<BookingActivity, Long> {
}
