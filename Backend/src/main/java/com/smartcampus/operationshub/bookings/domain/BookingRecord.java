package com.smartcampus.operationshub.bookings.domain;

import com.smartcampus.modulec.domain.UserRole;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Entity
public class BookingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long resourceId;
    private String resourceName;
    private String resourceLocation;
    private String requesterId;
    private String requesterName;
    private String requesterEmail;

    @Enumerated(EnumType.STRING)
    private UserRole requesterRole;

    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String purpose;
    private Integer attendees;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private String rejectionReason;
    private String cancellationRequestNote;
    private OffsetDateTime cancellationRequestedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long id) { this.resourceId = id; }
    public String getResourceName() { return resourceName; }
    public void setResourceName(String resourceName) { this.resourceName = resourceName; }
    public String getResourceLocation() { return resourceLocation; }
    public void setResourceLocation(String resourceLocation) { this.resourceLocation = resourceLocation; }
    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String requesterId) { this.requesterId = requesterId; }
    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }
    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }
    public UserRole getRequesterRole() { return requesterRole; }
    public void setRequesterRole(UserRole requesterRole) { this.requesterRole = requesterRole; }
    public LocalDate getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDate bookingDate) { this.bookingDate = bookingDate; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public Integer getAttendees() { return attendees; }
    public void setAttendees(Integer attendees) { this.attendees = attendees; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public String getCancellationRequestNote() { return cancellationRequestNote; }
    public void setCancellationRequestNote(String cancellationRequestNote) { this.cancellationRequestNote = cancellationRequestNote; }
    public OffsetDateTime getCancellationRequestedAt() { return cancellationRequestedAt; }
    public void setCancellationRequestedAt(OffsetDateTime cancellationRequestedAt) { this.cancellationRequestedAt = cancellationRequestedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
