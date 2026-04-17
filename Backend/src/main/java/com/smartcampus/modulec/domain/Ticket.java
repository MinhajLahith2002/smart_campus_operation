package com.smartcampus.modulec.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import com.smartcampus.operationshub.auth.domain.UserRole;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TicketCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TicketPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TicketStatus status;

    @Column(nullable = false, length = 80)
    private String reporterId;

    @Column(nullable = false, length = 120)
    private String reporterName;

    @Column(nullable = false, length = 120)
    private String reporterEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private UserRole reporterRole;

    @Column(length = 80)
    private String assignedTechnicianId;

    @Column(length = 120)
    private String assignedTechnicianName;

    @Column(nullable = false, length = 120)
    private String resourceName;

    @Column(nullable = false, length = 160)
    private String resourceLocation;

    @Column(length = 200)
    private String incidentLocation;

    private Long relatedBookingId;

    @Column(length = 200)
    private String relatedBookingLabel;

    @Column(length = 120)
    private String resourceType;

    @Column(length = 120)
    private String preferredContact;

    @Column(length = 120)
    private String operationalImpact;

    @Column(length = 2000)
    private String evidenceNotes;

    @Column(length = 2000)
    private String resolutionNotes;

    @Column(length = 2000)
    private String rejectionReason;

    @Column(length = 120)
    private String assignedByName;

    private OffsetDateTime assignedAt;

    @Column(length = 120)
    private String technicianStartedByName;

    private OffsetDateTime technicianStartedAt;

    @Column(length = 120)
    private String resolvedByName;

    private OffsetDateTime resolvedAt;

    @Column(length = 120)
    private String closedByName;

    private OffsetDateTime closedAt;

    @Column(length = 120)
    private String rejectedByName;

    private OffsetDateTime rejectedAt;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<TicketActivity> activities = new ArrayList<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    private List<TicketEvidence> evidenceItems = new ArrayList<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<TicketComment> comments = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TicketCategory getCategory() { return category; }
    public void setCategory(TicketCategory category) { this.category = category; }
    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }
    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus status) { this.status = status; }
    public String getReporterId() { return reporterId; }
    public void setReporterId(String reporterId) { this.reporterId = reporterId; }
    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }
    public String getReporterEmail() { return reporterEmail; }
    public void setReporterEmail(String reporterEmail) { this.reporterEmail = reporterEmail; }
    public UserRole getReporterRole() { return reporterRole; }
    public void setReporterRole(UserRole reporterRole) { this.reporterRole = reporterRole; }
    public String getAssignedTechnicianId() { return assignedTechnicianId; }
    public void setAssignedTechnicianId(String assignedTechnicianId) { this.assignedTechnicianId = assignedTechnicianId; }
    public String getAssignedTechnicianName() { return assignedTechnicianName; }
    public void setAssignedTechnicianName(String assignedTechnicianName) { this.assignedTechnicianName = assignedTechnicianName; }
    public String getResourceName() { return resourceName; }
    public void setResourceName(String resourceName) { this.resourceName = resourceName; }
    public String getResourceLocation() { return resourceLocation; }
    public void setResourceLocation(String resourceLocation) { this.resourceLocation = resourceLocation; }
    public String getIncidentLocation() { return incidentLocation; }
    public void setIncidentLocation(String incidentLocation) { this.incidentLocation = incidentLocation; }
    public Long getRelatedBookingId() { return relatedBookingId; }
    public void setRelatedBookingId(Long relatedBookingId) { this.relatedBookingId = relatedBookingId; }
    public String getRelatedBookingLabel() { return relatedBookingLabel; }
    public void setRelatedBookingLabel(String relatedBookingLabel) { this.relatedBookingLabel = relatedBookingLabel; }
    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public String getPreferredContact() { return preferredContact; }
    public void setPreferredContact(String preferredContact) { this.preferredContact = preferredContact; }
    public String getOperationalImpact() { return operationalImpact; }
    public void setOperationalImpact(String operationalImpact) { this.operationalImpact = operationalImpact; }
    public String getEvidenceNotes() { return evidenceNotes; }
    public void setEvidenceNotes(String evidenceNotes) { this.evidenceNotes = evidenceNotes; }
    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public String getAssignedByName() { return assignedByName; }
    public void setAssignedByName(String assignedByName) { this.assignedByName = assignedByName; }
    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(OffsetDateTime assignedAt) { this.assignedAt = assignedAt; }
    public String getTechnicianStartedByName() { return technicianStartedByName; }
    public void setTechnicianStartedByName(String technicianStartedByName) { this.technicianStartedByName = technicianStartedByName; }
    public OffsetDateTime getTechnicianStartedAt() { return technicianStartedAt; }
    public void setTechnicianStartedAt(OffsetDateTime technicianStartedAt) { this.technicianStartedAt = technicianStartedAt; }
    public String getResolvedByName() { return resolvedByName; }
    public void setResolvedByName(String resolvedByName) { this.resolvedByName = resolvedByName; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getClosedByName() { return closedByName; }
    public void setClosedByName(String closedByName) { this.closedByName = closedByName; }
    public OffsetDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(OffsetDateTime closedAt) { this.closedAt = closedAt; }
    public String getRejectedByName() { return rejectedByName; }
    public void setRejectedByName(String rejectedByName) { this.rejectedByName = rejectedByName; }
    public OffsetDateTime getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(OffsetDateTime rejectedAt) { this.rejectedAt = rejectedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<TicketActivity> getActivities() { return activities; }
    public void setActivities(List<TicketActivity> activities) { this.activities = activities; }
    public List<TicketEvidence> getEvidenceItems() { return evidenceItems; }
    public void setEvidenceItems(List<TicketEvidence> evidenceItems) { this.evidenceItems = evidenceItems; }
    public List<TicketComment> getComments() { return comments; }
    public void setComments(List<TicketComment> comments) { this.comments = comments; }
}

