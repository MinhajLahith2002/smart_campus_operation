/**
 * Booking Module - REST Controller
 * Handles booking lifecycle: create, approve, reject, cancel, conflict detection
 * @author Aran (Member 2 - Booking Management)
 */
package com.smartcampus.operationshub.bookings.controller;

import com.smartcampus.operationshub.bookings.dto.BookingDecisionRequest;
import com.smartcampus.operationshub.bookings.dto.BookingQuery;
import com.smartcampus.operationshub.bookings.dto.BookingResponse;
import com.smartcampus.operationshub.bookings.dto.BookingSummaryResponse;
import com.smartcampus.operationshub.bookings.dto.CreateBookingRequest;
import com.smartcampus.operationshub.bookings.service.BookingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    public List<BookingResponse> getBookings(@Valid BookingQuery query) {
        return bookingService.getBookings(query);
    }

    @GetMapping("/{bookingId}")
    public BookingResponse getBooking(@PathVariable @org.springframework.lang.NonNull Long bookingId) {
        return bookingService.getBookingResponse(bookingId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(@Valid @RequestBody CreateBookingRequest request) {
        return bookingService.createBooking(request);
    }

    @PutMapping("/{bookingId}")
    public BookingResponse updateBooking(@PathVariable Long bookingId, @Valid @RequestBody CreateBookingRequest request) {
        return bookingService.updateBooking(bookingId, request);
    }

    @PatchMapping("/{bookingId}/approve")
    public BookingResponse approve(@PathVariable Long bookingId, @Valid @RequestBody BookingDecisionRequest request) {
        return bookingService.approveBooking(bookingId, request);
    }

    @PatchMapping("/{bookingId}/reject")
    public BookingResponse reject(@PathVariable Long bookingId, @Valid @RequestBody BookingDecisionRequest request) {
        return bookingService.rejectBooking(bookingId, request);
    }

    @PatchMapping("/{bookingId}/cancel")
    public BookingResponse cancel(@PathVariable Long bookingId, @Valid @RequestBody BookingDecisionRequest request) {
        return bookingService.cancelBooking(bookingId, request);
    }

    @PatchMapping("/{bookingId}/request-cancel")
    public BookingResponse requestCancellation(@PathVariable Long bookingId, @Valid @RequestBody BookingDecisionRequest request) {
        return bookingService.requestCancellation(bookingId, request);
    }

    @GetMapping("/summary")
    public BookingSummaryResponse summary() {
        return bookingService.getSummary();
    }
        @GetMapping("/upcoming")
    public List<BookingResponse> getUpcomingBookings(@RequestParam String requesterId) {
        BookingQuery query = new BookingQuery(requesterId, "USER", "APPROVED");
        return bookingService.getBookings(query);
    }
        @GetMapping("/user/{requesterId}")
    public List<BookingResponse> getBookingsByUser(@PathVariable String requesterId) {
        BookingQuery query = new BookingQuery(requesterId, "USER", null);
        return bookingService.getBookings(query);
    }
}
