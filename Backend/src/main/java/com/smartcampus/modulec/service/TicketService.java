package com.smartcampus.modulec.service;

import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketActivity;
import com.smartcampus.modulec.domain.TicketComment;
import com.smartcampus.modulec.domain.TicketEvidence;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.dto.AssignTechnicianRequest;
import com.smartcampus.modulec.dto.CreateTicketRequest;
import com.smartcampus.modulec.dto.TicketActivityResponse;
import com.smartcampus.modulec.dto.TicketCommentRequest;
import com.smartcampus.modulec.dto.TicketCommentResponse;
import com.smartcampus.modulec.dto.TicketDecisionRequest;
import com.smartcampus.modulec.dto.TicketQuery;
import com.smartcampus.modulec.dto.TicketResponse;
import com.smartcampus.modulec.dto.TicketSummaryResponse;
import com.smartcampus.modulec.dto.UpdateTicketStatusRequest;
import com.smartcampus.modulec.repository.TicketCommentRepository;
import com.smartcampus.operationshub.notifications.domain.NotificationType;
import com.smartcampus.operationshub.notifications.service.NotificationService;
import com.smartcampus.modulec.repository.TicketRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TicketService {

    private static final Set<String> CRITICAL_KEYWORDS = Set.of("fire", "smoke", "flood", "gas leak", "electric shock", "sparking", "collapse", "unsafe", "injury");
    private static final Set<String> HIGH_KEYWORDS = Set.of("network down", "lab closed", "water leak", "power outage", "security", "camera offline", "server down");
    private static final Set<String> MEDIUM_KEYWORDS = Set.of("projector", "air conditioner", "wifi", "router", "printer", "lighting", "door");

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final NotificationService notificationService;

    public TicketService(TicketRepository ticketRepository, TicketCommentRepository ticketCommentRepository, NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.notificationService = notificationService;
    }

    public TicketResponse createTicket(CreateTicketRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        validateCreateRequest(request);

        Ticket ticket = new Ticket();
        String generatedTitle = buildTicketTitle(request);
        String generatedImpact = buildOperationalImpact(request);
        ticket.setTitle(generatedTitle);
        ticket.setDescription(request.description().trim());
        ticket.setCategory(request.category());
        ticket.setPriority(request.priority());
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setReporterId(request.reporterId().trim());
        ticket.setReporterName(request.reporterName().trim());
        ticket.setReporterEmail(request.reporterEmail().trim());
        ticket.setReporterRole(request.reporterRole());
        ticket.setResourceName(request.resourceName().trim());
        ticket.setResourceLocation(request.resourceLocation().trim());
        ticket.setIncidentLocation(request.incidentLocation().trim());
        ticket.setRelatedBookingId(request.relatedBookingId());
        ticket.setRelatedBookingLabel(trimToNull(request.relatedBookingLabel()));
        ticket.setResourceType(trimToNull(request.resourceType()));
        ticket.setPreferredContact(trimToNull(request.preferredContact()));
        ticket.setOperationalImpact(generatedImpact);
        ticket.setEvidenceNotes(trimToNull(request.evidenceNotes()));
        ticket.setCreatedAt(now);
        ticket.setUpdatedAt(now);

        if (request.evidenceLabels() != null) {
            request.evidenceLabels().stream()
                    .map(String::trim)
                    .filter(label -> !label.isBlank())
                    .limit(3)
                    .forEach(label -> {
                        TicketEvidence evidence = new TicketEvidence();
                        evidence.setTicket(ticket);
                        evidence.setLabel(label);
                        ticket.getEvidenceItems().add(evidence);
                    });
        }

        addActivity(ticket, request.reporterName().trim(), request.reporterRole(), "TICKET_CREATED",
                request.relatedBookingLabel() == null || request.relatedBookingLabel().isBlank()
                        ? "Ticket logged with resource, incident description, evidence references, and smart triage context."
                        : "Ticket logged with booking context: " + request.relatedBookingLabel().trim() + ".");

        return map(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTickets(TicketQuery query) {
        return ticketRepository.findAll().stream()
                .filter(ticket -> matchesRoleScope(ticket, query))
                .filter(ticket -> query.status() == null || ticket.getStatus().name().equalsIgnoreCase(query.status()))
                .filter(ticket -> query.priority() == null || ticket.getPriority().name().equalsIgnoreCase(query.priority()))
                .filter(ticket -> query.category() == null || ticket.getCategory().name().equalsIgnoreCase(query.category()))
                .filter(ticket -> !Boolean.parseBoolean(String.valueOf(query.assignedToMe()))
                        || (query.requesterId() != null && query.requesterId().equals(ticket.getAssignedTechnicianId())))
                .sorted(Comparator.comparing(Ticket::getUpdatedAt).reversed())
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicket(@NonNull Long ticketId, String requesterId, UserRole requesterRole) {
        Ticket ticket = findTicket(ticketId);
        ensureCanView(ticket, requesterId, requesterRole, "You cannot access this ticket.");
        return map(ticket);
    }

    public TicketResponse updateTicket(@NonNull Long ticketId, CreateTicketRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureEditableByReporter(ticket, request.reporterId(), request.reporterRole(), "Only the original reporter can edit an open ticket.");
        validateCreateRequest(request);

        ticket.setTitle(buildTicketTitle(request));
        ticket.setDescription(request.description().trim());
        ticket.setCategory(request.category());
        ticket.setPriority(request.priority());
        ticket.setResourceName(request.resourceName().trim());
        ticket.setResourceLocation(request.resourceLocation().trim());
        ticket.setIncidentLocation(request.incidentLocation().trim());
        ticket.setRelatedBookingId(request.relatedBookingId());
        ticket.setRelatedBookingLabel(trimToNull(request.relatedBookingLabel()));
        ticket.setResourceType(trimToNull(request.resourceType()));
        ticket.setPreferredContact(trimToNull(request.preferredContact()));
        ticket.setOperationalImpact(buildOperationalImpact(request));
        ticket.setEvidenceNotes(trimToNull(request.evidenceNotes()));
        ticket.setUpdatedAt(OffsetDateTime.now());

        ticket.getEvidenceItems().clear();
        if (request.evidenceLabels() != null) {
            request.evidenceLabels().stream()
                    .map(String::trim)
                    .filter(label -> !label.isBlank())
                    .limit(3)
                    .forEach(label -> {
                        TicketEvidence evidence = new TicketEvidence();
                        evidence.setTicket(ticket);
                        evidence.setLabel(label);
                        ticket.getEvidenceItems().add(evidence);
                    });
        }

        addActivity(ticket, request.reporterName().trim(), request.reporterRole(), "TICKET_UPDATED",
                "Reporter updated the ticket details before operational work began.");

        return map(ticketRepository.save(ticket));
    }

    public void deleteTicket(@NonNull Long ticketId, TicketDecisionRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureEditableByReporter(ticket, request.actorId(), request.actorRole(), "Only the original reporter can delete an open ticket.");
        ticketRepository.delete(ticket);
    }

    public TicketResponse assignTechnician(@NonNull Long ticketId, AssignTechnicianRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureAdmin(request.actorRole(), "Only admins can assign technicians.");
        validateAssignment(request);

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setAssignedTechnicianId(request.technicianId().trim());
        ticket.setAssignedTechnicianName(request.technicianName().trim());
        ticket.setAssignedByName(fallbackActorName(request.actorName(), "Operations Desk"));
        ticket.setAssignedAt(now);
        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED && ticket.getStatus() != TicketStatus.REJECTED) {
            ticket.setStatus(TicketStatus.ASSIGNED);
        }
        ticket.setUpdatedAt(now);

        addActivity(ticket,
                fallbackActorName(request.actorName(), "Operations Desk"),
                request.actorRole(),
                "TECHNICIAN_ASSIGNED",
                "Assigned to " + request.technicianName().trim() + " (" + request.technicianId().trim() + ").");

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse updateStatus(@NonNull Long ticketId, UpdateTicketStatusRequest request) {
        Ticket ticket = findTicket(ticketId);
        TicketStatus currentStatus = ticket.getStatus();
        TicketStatus nextStatus = request.status();

        ensureStatusPermission(ticket, request.actorId(), request.actorRole(), nextStatus);

        if (nextStatus == TicketStatus.CLOSED || nextStatus == TicketStatus.OPEN) {
            throw new IllegalArgumentException("Use the close or reopen workflow for that transition.");
        }
        if (nextStatus == TicketStatus.RESOLVED && isBlank(request.resolutionNotes())) {
            throw new IllegalArgumentException("Resolution notes are required when resolving a ticket.");
        }
        if (nextStatus == TicketStatus.REJECTED && isBlank(request.detail())) {
            throw new IllegalArgumentException("A rejection reason is required when rejecting a ticket.");
        }
        ensureTransitionAllowed(currentStatus, nextStatus);

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(nextStatus);
        if (nextStatus == TicketStatus.REJECTED) {
            ticket.setAssignedTechnicianId(null);
            ticket.setAssignedTechnicianName(null);
            ticket.setRejectionReason(request.detail().trim());
            ticket.setRejectedByName(fallbackActorName(request.actorName(), "Module C Desk"));
            ticket.setRejectedAt(now);
        }
        if (nextStatus == TicketStatus.IN_PROGRESS) {
            ticket.setTechnicianStartedByName(fallbackActorName(request.actorName(), "Assigned Technician"));
            ticket.setTechnicianStartedAt(now);
        }
        if (nextStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedByName(fallbackActorName(request.actorName(), "Assigned Technician"));
            ticket.setResolvedAt(now);
            ticket.setRejectionReason(null);
        }
        if (!isBlank(request.resolutionNotes())) {
            ticket.setResolutionNotes(request.resolutionNotes().trim());
        }
        ticket.setUpdatedAt(now);

        addActivity(ticket,
                fallbackActorName(request.actorName(), "Module C Desk"),
                request.actorRole(),
                "STATUS_UPDATED",
                isBlank(request.detail())
                        ? "Ticket moved to " + nextStatus.name() + "."
                        : request.detail().trim());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse closeTicket(@NonNull Long ticketId, TicketDecisionRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureReporterOnly(ticket, request.actorId(), request.actorRole(), "Only the original reporter can confirm and close this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be closed.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setClosedByName(fallbackActorName(request.actorName(), "Ticket Reporter"));
        ticket.setClosedAt(now);
        ticket.setUpdatedAt(now);
        addActivity(ticket,
                fallbackActorName(request.actorName(), "Ticket Reporter"),
                request.actorRole(),
                "TICKET_CLOSED",
                isBlank(request.note()) ? "Resolution confirmed and ticket closed." : request.note().trim());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse reopenTicket(@NonNull Long ticketId, TicketDecisionRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureReporterOnly(ticket, request.actorId(), request.actorRole(), "Only the original reporter can reopen this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be reopened.");
        }
        if (isBlank(request.note())) {
            throw new IllegalArgumentException("A reopen note is required when reporting the issue as still broken.");
        }

        ticket.setStatus(TicketStatus.OPEN);
        ticket.setUpdatedAt(OffsetDateTime.now());
        addActivity(ticket,
                fallbackActorName(request.actorName(), "Ticket Reporter"),
                request.actorRole(),
                "TICKET_REOPENED",
                request.note().trim());

        return map(ticketRepository.save(ticket));
    }

    public TicketCommentResponse addComment(@NonNull Long ticketId, TicketCommentRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureCanView(ticket, request.actorId(), request.actorRole(), "You cannot comment on this ticket.");
        ensureCommentable(ticket);
        validateCommentBody(request.body());

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthorId(request.actorId().trim());
        comment.setAuthorName(request.actorName().trim());
        comment.setAuthorRole(request.actorRole());
        comment.setBody(request.body().trim());
        comment.setCreatedAt(OffsetDateTime.now());
        comment.setUpdatedAt(comment.getCreatedAt());
        comment.setEdited(false);
        comment.setDeleted(false);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, request.actorName().trim(), request.actorRole(), "COMMENT_ADDED", "New comment added to the ticket discussion.");
        ticketRepository.save(ticket);
        TicketComment savedComment = ticketCommentRepository.save(comment);
        return mapComment(savedComment);
    }

    public TicketCommentResponse updateComment(@NonNull Long commentId, TicketCommentRequest request) {
        TicketComment comment = findComment(commentId);
        Ticket ticket = comment.getTicket();
        ensureCommentable(ticket);
        ensureCanView(ticket, request.actorId(), request.actorRole(), "You cannot edit comments on this ticket.");
        if (!request.actorId().equals(comment.getAuthorId())) {
            throw new SecurityException("Only the comment owner can edit this comment.");
        }
        validateCommentBody(request.body());

        comment.setBody(request.body().trim());
        comment.setUpdatedAt(OffsetDateTime.now());
        comment.setEdited(true);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, request.actorName().trim(), request.actorRole(), "COMMENT_EDITED", "A comment was edited by its owner.");
        ticketRepository.save(ticket);
        return mapComment(comment);
    }

    public void deleteComment(@NonNull Long commentId, TicketDecisionRequest request) {
        TicketComment comment = findComment(commentId);
        Ticket ticket = comment.getTicket();
        ensureCanView(ticket, request.actorId(), request.actorRole(), "You cannot moderate this ticket discussion.");
        if (request.actorRole() != UserRole.ADMIN && !request.actorId().equals(comment.getAuthorId())) {
            throw new SecurityException("Only the comment owner or an admin can delete this comment.");
        }

        comment.setDeleted(true);
        comment.setBody("Comment removed");
        comment.setUpdatedAt(OffsetDateTime.now());
        comment.setEdited(true);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, fallbackActorName(request.actorName(), "Comment owner"), request.actorRole(), "COMMENT_DELETED", "A comment was removed from the ticket discussion.");
        ticketRepository.save(ticket);
    }

    @Transactional(readOnly = true)
    public TicketSummaryResponse getSummary() {
        List<Ticket> tickets = ticketRepository.findAll();
        return new TicketSummaryResponse(
                tickets.size(),
                tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.OPEN).count(),
                tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.TRIAGED).count(),
                tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.ASSIGNED).count(),
                tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.IN_PROGRESS).count(),
                tickets.stream().filter(ticket -> ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED).count(),
                tickets.stream().filter(ticket -> ticket.getAssignedTechnicianId() == null || ticket.getAssignedTechnicianId().isBlank()).count(),
                tickets.stream().filter(ticket -> ticket.getPriority() == TicketPriority.HIGH || ticket.getPriority() == TicketPriority.CRITICAL).count()
        );
    }

    private Ticket findTicket(@NonNull Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket " + ticketId + " was not found."));
    }

    private TicketComment findComment(@NonNull Long commentId) {
        return ticketCommentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment " + commentId + " was not found."));
    }

    private boolean matchesRoleScope(Ticket ticket, TicketQuery query) {
        if (query.requesterRole() == UserRole.ADMIN) {
            return true;
        }
        if (query.requesterRole() == UserRole.TECHNICIAN) {
            boolean matchesTechnician = query.requesterId() == null || query.requesterId().equals(ticket.getAssignedTechnicianId());
            if (!matchesTechnician) {
                return false;
            }
            return ticket.getStatus() != TicketStatus.REJECTED
                    && ticket.getStatus() != TicketStatus.CLOSED
                    && ticket.getStatus() != TicketStatus.RESOLVED;
        }
        return query.requesterId() != null && query.requesterId().equals(ticket.getReporterId());
    }

    private void ensureAdmin(UserRole actorRole, String message) {
        if (actorRole != UserRole.ADMIN) {
            throw new SecurityException(message);
        }
    }

    private void ensureReporterOnly(Ticket ticket, String actorId, UserRole actorRole, String message) {
        if (actorRole != ticket.getReporterRole()) {
            throw new SecurityException(message);
        }
        if (actorId == null || !actorId.equals(ticket.getReporterId())) {
            throw new SecurityException(message);
        }
    }

    private void ensureEditableByReporter(Ticket ticket, String actorId, UserRole actorRole, String message) {
        if (actorRole != UserRole.STUDENT && actorRole != UserRole.STAFF) {
            throw new SecurityException(message);
        }
        if (actorId == null || !actorId.equals(ticket.getReporterId())) {
            throw new SecurityException(message);
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new IllegalArgumentException("Only open tickets can be edited or deleted.");
        }
    }

    private void ensureCanView(Ticket ticket, String actorId, UserRole actorRole, String message) {
        if (actorRole == UserRole.ADMIN) return;
        if (actorRole == UserRole.TECHNICIAN && actorId != null && actorId.equals(ticket.getAssignedTechnicianId())) return;
        if (actorId != null && actorId.equals(ticket.getReporterId())) return;
        throw new SecurityException(message);
    }

    private void ensureCommentable(Ticket ticket) {
        if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.REJECTED) {
            throw new IllegalArgumentException("Comments are disabled for closed or rejected tickets.");
        }
    }

    private void ensureStatusPermission(Ticket ticket, String actorId, UserRole actorRole, TicketStatus nextStatus) {
        if (actorRole == UserRole.ADMIN) {
            if (nextStatus != TicketStatus.REJECTED) {
                throw new SecurityException("Admins can only reject tickets. Assignment is the admin workflow action for active cases.");
            }
            return;
        }
        if (actorRole != UserRole.TECHNICIAN) {
            throw new SecurityException("Only the assigned technician can move active ticket work forward.");
        }
        if (actorId == null || !actorId.equals(ticket.getAssignedTechnicianId())) {
            throw new SecurityException("Only the assigned technician can update this ticket.");
        }
        if (nextStatus != TicketStatus.IN_PROGRESS && nextStatus != TicketStatus.RESOLVED) {
            throw new SecurityException("Technicians can only move assigned tickets to In Progress or Resolved.");
        }
    }

    private void ensureTransitionAllowed(TicketStatus currentStatus, TicketStatus nextStatus) {
        boolean allowed = switch (currentStatus) {
            case OPEN, TRIAGED, ASSIGNED -> nextStatus == TicketStatus.IN_PROGRESS || nextStatus == TicketStatus.REJECTED;
            case IN_PROGRESS -> nextStatus == TicketStatus.RESOLVED || nextStatus == TicketStatus.REJECTED;
            default -> false;
        };

        if (!allowed) {
            throw new IllegalArgumentException("Illegal ticket transition from " + currentStatus + " to " + nextStatus + ".");
        }
    }

    private void validateCreateRequest(CreateTicketRequest request) {

        if (request.description().trim().length() < 30) {
            throw new IllegalArgumentException("Incident description must be at least 30 characters.");
        }

        if (request.preferredContact() == null || request.preferredContact().trim().isBlank()) {
            throw new IllegalArgumentException("Preferred contact is required.");
        }
        if (request.incidentLocation() == null || request.incidentLocation().trim().length() < 6) {
            throw new IllegalArgumentException("Incident location must be at least 6 characters.");
        }
        if (request.evidenceLabels() != null) {
            if (request.evidenceLabels().size() > 3) {
                throw new IllegalArgumentException("Only up to 3 evidence references are allowed.");
            }
            Set<String> uniqueLabels = request.evidenceLabels().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(label -> !label.isBlank())
                    .map(label -> label.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toSet());
            long nonBlankCount = request.evidenceLabels().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(label -> !label.isBlank())
                    .count();
            if (uniqueLabels.size() != nonBlankCount) {
                throw new IllegalArgumentException("Evidence references must be unique.");
            }
        }

        TicketPriority suggestedPriority = deriveSuggestedPriority(
                buildTicketTitle(request), request.description(), buildOperationalImpact(request), request.category().name(),
                request.evidenceLabels() == null ? 0 : (int) request.evidenceLabels().stream().filter(Objects::nonNull).map(String::trim).filter(label -> !label.isBlank()).count());
        if (priorityRank(request.priority()) + 1 < priorityRank(suggestedPriority)) {
            throw new IllegalArgumentException("The incident language suggests at least " + suggestedPriority.name() + " priority. Increase the selected priority or reduce the urgency wording.");
        }
    }

    private String buildTicketTitle(CreateTicketRequest request) {
        if (!isBlank(request.title())) {
            return request.title().trim();
        }

        if (!isBlank(request.relatedBookingLabel())) {
            return "Issue affecting " + request.relatedBookingLabel().trim();
        }

        return "Issue affecting " + request.resourceName().trim();
    }

    private String buildOperationalImpact(CreateTicketRequest request) {
        if (!isBlank(request.operationalImpact())) {
            return request.operationalImpact().trim();
        }

        if (!isBlank(request.relatedBookingLabel())) {
            return "Booking session disrupted at " + request.incidentLocation().trim();
        }

        return "Campus asset issue reported at " + request.incidentLocation().trim();
    }

    private void validateAssignment(AssignTechnicianRequest request) {
        if (isBlank(request.technicianId()) || isBlank(request.technicianName())) {
            throw new IllegalArgumentException("Technician ID and name are required for assignment.");
        }
    }

    private void validateCommentBody(String body) {
        if (body == null || body.trim().length() < 5) {
            throw new IllegalArgumentException("Comments must be at least 5 characters.");
        }
        if (body.trim().length() > 500) {
            throw new IllegalArgumentException("Comments must be 500 characters or fewer.");
        }
    }

    private String fallbackActorName(String actorName, String fallback) {
        return actorName == null || actorName.isBlank() ? fallback : actorName.trim();
    }

    private void addActivity(Ticket ticket, String actorName, UserRole actorRole, String action, String detail) {
        TicketActivity activity = new TicketActivity();
        activity.setTicket(ticket);
        activity.setActorName(actorName);
        activity.setActorRole(actorRole);
        activity.setAction(action);
        activity.setDetail(detail);
        activity.setCreatedAt(OffsetDateTime.now());
        ticket.getActivities().add(activity);
    }

    private TicketCommentResponse mapComment(TicketComment comment) {
        return new TicketCommentResponse(
                comment.getId(),
                comment.getAuthorId(),
                comment.getAuthorName(),
                comment.getAuthorRole(),
                comment.getBody(),
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                comment.isEdited(),
                comment.isDeleted()
        );
    }

    private TicketResponse map(Ticket ticket) {
        long similarOpenIncidents = countSimilarOpenIncidents(ticket);
        int completenessScore = calculateCompleteness(ticket);
        int smartPriorityScore = calculateIncidentScore(ticket);
        String smartPriorityLabel = deriveSuggestedPriority(ticket.getTitle(), ticket.getDescription(), ticket.getOperationalImpact(), ticket.getCategory().name(), ticket.getEvidenceItems().size()).name();
        String responseTarget = responseTargetFor(smartPriorityLabel);

        return new TicketResponse(
                ticket.getId(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getReporterId(),
                ticket.getReporterName(),
                ticket.getReporterEmail(),
                ticket.getReporterRole(),
                ticket.getAssignedTechnicianId(),
                ticket.getAssignedTechnicianName(),
                ticket.getResourceName(),
                ticket.getResourceLocation(),
                ticket.getIncidentLocation(),
                ticket.getRelatedBookingId(),
                ticket.getRelatedBookingLabel(),
                ticket.getResourceType(),
                ticket.getPreferredContact(),
                ticket.getOperationalImpact(),
                ticket.getEvidenceNotes(),
                ticket.getResolutionNotes(),
                ticket.getRejectionReason(),
                ticket.getAssignedByName(),
                ticket.getAssignedAt(),
                ticket.getTechnicianStartedByName(),
                ticket.getTechnicianStartedAt(),
                ticket.getResolvedByName(),
                ticket.getResolvedAt(),
                ticket.getClosedByName(),
                ticket.getClosedAt(),
                ticket.getRejectedByName(),
                ticket.getRejectedAt(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getEvidenceItems().stream().map(TicketEvidence::getLabel).toList(),
                ticket.getActivities().stream()
                        .map(activity -> new TicketActivityResponse(
                                activity.getId(),
                                activity.getActorName(),
                                activity.getActorRole(),
                                activity.getAction(),
                                activity.getDetail(),
                                activity.getCreatedAt()))
                        .toList(),
                ticket.getComments().stream().map(this::mapComment).toList(),
                similarOpenIncidents,
                completenessScore,
                smartPriorityScore,
                smartPriorityLabel,
                responseTarget
        );
    }

    private long countSimilarOpenIncidents(Ticket ticket) {
        return ticketRepository.findAll().stream()
                .filter(other -> !Objects.equals(other.getId(), ticket.getId()))
                .filter(other -> other.getStatus() != TicketStatus.CLOSED && other.getStatus() != TicketStatus.REJECTED)
                .filter(other -> Objects.equals(normalise(other.getResourceName()), normalise(ticket.getResourceName()))
                        || Objects.equals(other.getCategory(), ticket.getCategory()))
                .count();
    }

    private int calculateCompleteness(Ticket ticket) {
        int score = 0;
        if (!isBlank(ticket.getTitle()) && ticket.getTitle().trim().length() >= 8) score += 20;
        if (!isBlank(ticket.getDescription()) && ticket.getDescription().trim().length() >= 30) score += 30;
        if (!isBlank(ticket.getOperationalImpact()) && ticket.getOperationalImpact().trim().length() >= 12) score += 20;
        if (!isBlank(ticket.getPreferredContact())) score += 15;
        if (!ticket.getEvidenceItems().isEmpty()) score += 15;
        return score;
    }

    private int calculateIncidentScore(Ticket ticket) {
        return calculateIncidentScore(ticket.getTitle(), ticket.getDescription(), ticket.getOperationalImpact(), ticket.getCategory().name(), ticket.getEvidenceItems().size());
    }

    private int calculateIncidentScore(String title, String description, String operationalImpact, String category, int evidenceCount) {
        String text = (defaultString(title) + " " + defaultString(description) + " " + defaultString(operationalImpact)).toLowerCase(Locale.ROOT);
        int score = 22;

        if ("SAFETY".equals(category)) score += 28;
        if ("NETWORK".equals(category)) score += 10;
        if (evidenceCount > 0) score += Math.min(evidenceCount * 8, 24);
        if (defaultString(description).trim().length() >= 80) score += 12;
        if (defaultString(operationalImpact).trim().length() >= 20) score += 10;
        score += keywordHits(text, CRITICAL_KEYWORDS) * 18;
        score += keywordHits(text, HIGH_KEYWORDS) * 10;
        score += keywordHits(text, MEDIUM_KEYWORDS) * 4;

        return Math.min(score, 100);
    }

    private TicketPriority deriveSuggestedPriority(String title, String description, String operationalImpact, String category, int evidenceCount) {
        int score = calculateIncidentScore(title, description, operationalImpact, category, evidenceCount);
        if (score >= 82) return TicketPriority.CRITICAL;
        if (score >= 62) return TicketPriority.HIGH;
        if (score >= 40) return TicketPriority.MEDIUM;
        return TicketPriority.LOW;
    }

    private String responseTargetFor(String priority) {
        return switch (priority) {
            case "CRITICAL" -> "Immediate dispatch";
            case "HIGH" -> "Within 4 working hours";
            case "MEDIUM" -> "Within 1 working day";
            default -> "Within 2 working days";
        };
    }

    private int priorityRank(TicketPriority priority) {
        return switch (priority) {
            case LOW -> 1;
            case MEDIUM -> 2;
            case HIGH -> 3;
            case CRITICAL -> 4;
        };
    }

    private int keywordHits(String text, Set<String> keywords) {
        return (int) keywords.stream().filter(text::contains).count();
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private String normalise(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}






