package com.smartcampus.modulec.service;

import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketActivity;
import com.smartcampus.modulec.domain.TicketComment;
import com.smartcampus.modulec.domain.TicketEvidence;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.modulec.dto.AssignTechnicianRequest;
import com.smartcampus.modulec.dto.CreateTicketRequest;
import com.smartcampus.modulec.dto.DuplicateTicketCheckRequest;
import com.smartcampus.modulec.dto.DuplicateTicketMatchResponse;
import com.smartcampus.modulec.dto.TicketActivityResponse;
import com.smartcampus.modulec.dto.TicketCommentRequest;
import com.smartcampus.modulec.dto.TicketCommentResponse;
import com.smartcampus.modulec.dto.TicketDecisionRequest;
import com.smartcampus.modulec.dto.TicketQuery;
import com.smartcampus.modulec.dto.TicketResponse;
import com.smartcampus.modulec.dto.TicketSummaryResponse;
import com.smartcampus.modulec.dto.UpdateTicketStatusRequest;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.modulec.repository.TicketCommentRepository;
import com.smartcampus.operationshub.notifications.domain.NotificationType;
import com.smartcampus.operationshub.notifications.service.NotificationService;
import com.smartcampus.modulec.repository.TicketRepository;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import jakarta.persistence.EntityNotFoundException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private static final Set<TicketStatus> ACTIVE_DUPLICATE_STATUSES = Set.of(TicketStatus.OPEN, TicketStatus.TRIAGED, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS);
    private static final Set<String> DUPLICATE_STOP_WORDS = Set.of("the", "and", "with", "from", "that", "this", "have", "into", "during", "after", "before", "when", "where", "which", "issue", "problem", "reported", "reporting", "affecting", "session", "lecture", "campus", "building", "floor", "room", "asset");

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final NotificationService notificationService;
    private final AuthUserRepository authUserRepository;

    public TicketService(TicketRepository ticketRepository,
                         TicketCommentRepository ticketCommentRepository,
                         NotificationService notificationService,
                         AuthUserRepository authUserRepository) {
        this.ticketRepository = ticketRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.notificationService = notificationService;
        this.authUserRepository = authUserRepository;
    }


    public TicketResponse createTicket(CreateTicketRequest request, AuthUserPrincipal principal) {
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
        ticket.setReporterId(principal.getPublicId());
        ticket.setReporterName(principal.getFullName());
        ticket.setReporterEmail(principal.getEmail());
        ticket.setReporterRole(principal.getRole());
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

        addActivity(ticket, principal.getFullName(), principal.getRole(), "TICKET_CREATED",
                request.relatedBookingLabel() == null || request.relatedBookingLabel().isBlank()
                        ? "Ticket logged with resource, incident description, evidence references, and smart triage context."
                        : "Ticket logged with booking context: " + request.relatedBookingLabel().trim() + ".");

        return map(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTickets(TicketQuery query, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        List<Ticket> allTickets = ticketRepository.findAllByOrderByUpdatedAtDesc();
        Map<Long, Long> similarOpenIncidentCounts = buildSimilarOpenIncidentCounts(allTickets);

        return allTickets.stream()
                .filter(ticket -> matchesRoleScope(ticket, principal.getPublicId(), actorRole, query))
                .filter(ticket -> query.status() == null || ticket.getStatus().name().equalsIgnoreCase(query.status()))
                .filter(ticket -> query.priority() == null || ticket.getPriority().name().equalsIgnoreCase(query.priority()))
                .filter(ticket -> query.category() == null || ticket.getCategory().name().equalsIgnoreCase(query.category()))
                .map(ticket -> map(ticket, similarOpenIncidentCounts.getOrDefault(ticket.getId(), 0L), false))
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicket(Long ticketId, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        ensureCanView(ticket, principal.getPublicId(), actorRole, "You cannot access this ticket.");
        return map(ticket);
    }

    public TicketResponse updateTicket(@NonNull Long ticketId, CreateTicketRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        ensureEditableByReporter(ticket, principal.getPublicId(), actorRole, "Only the original reporter can edit an open ticket.");
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

        addActivity(ticket, principal.getFullName(), principal.getRole(), "TICKET_UPDATED",
                "Reporter updated the ticket details before operational work began.");

        return map(ticketRepository.save(ticket));
    }

    public void deleteTicket(@NonNull Long ticketId, TicketDecisionRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        ensureCanDeleteTicket(ticket, principal.getPublicId(), actorRole, "Only the original reporter or an admin can delete this ticket.");
        ticketRepository.delete(ticket);
    }

    public TicketResponse assignTechnician(Long ticketId, AssignTechnicianRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        ensureAdmin(actorRole, "Only admins can assign technicians.");
        validateAssignment(request);
        ensureAssignable(ticket);
        ensureNoDuplicateDispatchConflict(ticket);

        AuthUser technician = authUserRepository.findByPublicId(request.technicianId())
                .orElseThrow(() -> new IllegalArgumentException("Selected technician was not found."));
        if (technician.getRole() != UserRole.TECHNICIAN || technician.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("Selected technician is not available for assignment.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setAssignedTechnicianId(technician.getPublicId());
        ticket.setAssignedTechnicianName(technician.getFullName());
        ticket.setAssignedByName(fallbackActorName(principal.getFullName(), "Operations Desk"));
        ticket.setAssignedAt(now);
        ticket.setStatus(TicketStatus.ASSIGNED);
        ticket.setUpdatedAt(now);
        addActivity(ticket, principal.getFullName(), actorRole, "TECHNICIAN_ASSIGNED",
                "Assigned to " + technician.getFullName() + " (" + technician.getPublicId() + ").");

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse updateStatus(Long ticketId, UpdateTicketStatusRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        TicketStatus currentStatus = ticket.getStatus();
        TicketStatus nextStatus = request.status();

        ensureStatusPermission(ticket, principal.getPublicId(), actorRole, nextStatus);

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
                principal.getFullName(),
                actorRole,
                "STATUS_UPDATED",
                isBlank(request.detail())
                        ? "Ticket moved to " + nextStatus.name() + "."
                        : request.detail().trim());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse closeTicket(Long ticketId, TicketDecisionRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        ensureReporterOrAdmin(ticket,
                principal.getPublicId(),
                principal.getEmail(),
                actorRole,
                "Only the reporter or an admin can close this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be closed.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setClosedByName(fallbackActorName(request.actorName(), "Ticket Reporter"));
        ticket.setClosedAt(now);
        ticket.setUpdatedAt(now);
        addActivity(ticket,
                principal.getFullName(),
                actorRole,
                "TICKET_CLOSED",
                isBlank(request.note()) ? "Resolution confirmed and ticket closed." : request.note().trim());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse reopenTicket(Long ticketId, TicketDecisionRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        ensureReporterOrAdmin(ticket,
                principal.getPublicId(),
                principal.getEmail(),
                actorRole,
                "Only the reporter or an admin can reopen this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be reopened.");
        }
        if (isBlank(request.note())) {
            throw new IllegalArgumentException("A reopen note is required when reporting the issue as still broken.");
        }
        validateSingleEvidenceUpload(request.evidenceLabel(), request.evidenceDataUrl());

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setAssignedTechnicianId(null);
        ticket.setAssignedTechnicianName(null);
        ticket.setAssignedByName(null);
        ticket.setAssignedAt(null);
        ticket.setTechnicianStartedByName(null);
        ticket.setTechnicianStartedAt(null);
        ticket.setResolvedByName(null);
        ticket.setResolvedAt(null);
        ticket.setClosedByName(null);
        ticket.setClosedAt(null);
        ticket.setUpdatedAt(now);
        appendReopenEvidence(ticket, request.evidenceLabel(), request.evidenceDataUrl());
        addActivity(ticket,
                principal.getFullName(),
                actorRole,
                "TICKET_REOPENED",
                buildReopenDetail(request.note(), request.evidenceLabel()));

        return map(ticketRepository.save(ticket));
    }

    public TicketCommentResponse addComment(Long ticketId, TicketCommentRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        Ticket ticket = findTicket(ticketId);
        ensureCanView(ticket, principal.getPublicId(), actorRole, "You cannot comment on this ticket.");
        ensureCommentable(ticket);
        validateCommentBody(request.body());

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthorId(principal.getPublicId());
        comment.setAuthorName(principal.getFullName());
        comment.setAuthorRole(principal.getRole());
        comment.setBody(request.body().trim());
        comment.setCreatedAt(OffsetDateTime.now());
        comment.setUpdatedAt(comment.getCreatedAt());
        comment.setEdited(false);
        comment.setDeleted(false);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, principal.getFullName(), actorRole, "COMMENT_ADDED", "New comment added to the ticket discussion.");
        ticketRepository.save(ticket);
        TicketComment savedComment = ticketCommentRepository.save(comment);
        return mapComment(savedComment);
    }

    public TicketCommentResponse updateComment(Long commentId, TicketCommentRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        TicketComment comment = findComment(commentId);
        Ticket ticket = comment.getTicket();
        ensureCommentable(ticket);
        ensureCanView(ticket, principal.getPublicId(), actorRole, "You cannot edit comments on this ticket.");
        if (!principal.getPublicId().equals(comment.getAuthorId())) {
            throw new SecurityException("Only the comment owner can edit this comment.");
        }
        validateCommentBody(request.body());

        comment.setBody(request.body().trim());
        comment.setUpdatedAt(OffsetDateTime.now());
        comment.setEdited(true);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, principal.getFullName(), actorRole, "COMMENT_EDITED", "A comment was edited by its owner.");
        ticketRepository.save(ticket);
        return mapComment(comment);
    }

    public void deleteComment(Long commentId, TicketDecisionRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        TicketComment comment = findComment(commentId);
        Ticket ticket = comment.getTicket();
        ensureCanView(ticket, principal.getPublicId(), actorRole, "You cannot moderate this ticket discussion.");
        if (actorRole != UserRole.ADMIN && !principal.getPublicId().equals(comment.getAuthorId())) {
            throw new SecurityException("Only the comment owner or an admin can delete this comment.");
        }

        comment.setDeleted(true);
        comment.setBody("Comment removed");
        comment.setUpdatedAt(OffsetDateTime.now());
        comment.setEdited(true);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, principal.getFullName(), actorRole, "COMMENT_DELETED", "A comment was removed from the ticket discussion.");
        ticketRepository.save(ticket);
    }

    @Transactional(readOnly = true)
    public TicketSummaryResponse getSummary() {
        List<Ticket> tickets = ticketRepository.findAll();
        long open = 0;
        long triaged = 0;
        long assigned = 0;
        long inProgress = 0;
        long resolved = 0;
        long unassigned = 0;
        long highOrCritical = 0;

        for (Ticket ticket : tickets) {
            if (ticket.getAssignedTechnicianId() == null || ticket.getAssignedTechnicianId().isBlank()) {
                unassigned++;
            }
            if (ticket.getPriority() == TicketPriority.HIGH || ticket.getPriority() == TicketPriority.CRITICAL) {
                highOrCritical++;
            }

            switch (ticket.getStatus()) {
                case OPEN -> open++;
                case TRIAGED -> triaged++;
                case ASSIGNED -> assigned++;
                case IN_PROGRESS -> inProgress++;
                case RESOLVED, CLOSED -> resolved++;
                default -> {
                }
            }
        }

        return new TicketSummaryResponse(
                tickets.size(),
                open,
                triaged,
                assigned,
                inProgress,
                resolved,
                unassigned,
                highOrCritical
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

    private boolean matchesRoleScope(Ticket ticket, String actorId, UserRole actorRole, TicketQuery query) {
        if (actorRole == UserRole.ADMIN) {
            return true;
        }
        if (actorRole == UserRole.TECHNICIAN) {
            if (Boolean.parseBoolean(String.valueOf(query.assignedToMe()))) {
                return actorId.equals(ticket.getAssignedTechnicianId());
            }
            return actorId.equals(ticket.getAssignedTechnicianId());
        }
        return actorId.equals(ticket.getReporterId());
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

    private void ensureReporterOrAdmin(Ticket ticket, String actorId, String actorEmail, UserRole actorRole, String message) {
        if (actorRole == UserRole.ADMIN) return;
        if (matchesReporterIdentity(ticket, actorId, actorEmail, actorRole)) return;
        throw new SecurityException(message);
    }

    private boolean matchesReporterIdentity(Ticket ticket, String actorId, String actorEmail, UserRole actorRole) {
        if (actorRole != ticket.getReporterRole()) {
            return false;
        }

        if (actorId != null && actorId.equals(ticket.getReporterId())) {
            return true;
        }

        String normalizedActorEmail = normalizeEmail(actorEmail);
        String normalizedReporterEmail = normalizeEmail(ticket.getReporterEmail());
        return normalizedActorEmail != null && normalizedActorEmail.equals(normalizedReporterEmail);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
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

    private void ensureCanDeleteTicket(Ticket ticket, String actorId, UserRole actorRole, String message) {
        if (actorRole == UserRole.ADMIN) {
            return;
        }
        if (actorRole != UserRole.STUDENT && actorRole != UserRole.STAFF) {
            throw new SecurityException(message);
        }
        if (actorId == null || !actorId.equals(ticket.getReporterId())) {
            throw new SecurityException(message);
        }
        if (ticket.getStatus() != TicketStatus.OPEN
                && ticket.getStatus() != TicketStatus.CLOSED
                && ticket.getStatus() != TicketStatus.REJECTED) {
            throw new IllegalArgumentException("Only open, closed, or rejected tickets can be deleted by the reporter.");
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

    private void ensureAssignable(Ticket ticket) {
        if (ticket.getStatus() == TicketStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("This ticket is already in progress, so technician reassignment is locked.");
        }
        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.REJECTED) {
            throw new IllegalArgumentException("Only open, triaged, or assigned tickets can receive a technician assignment.");
        }
    }

    private void ensureNoDuplicateDispatchConflict(Ticket ticket) {
        List<Ticket> similarActiveTickets = ticketRepository.findAll().stream()
                .filter(other -> !Objects.equals(other.getId(), ticket.getId()))
                .filter(other -> ACTIVE_DUPLICATE_STATUSES.contains(other.getStatus()))
                .filter(other -> isLikelySameIncident(ticket, other))
                .sorted(Comparator.comparing(Ticket::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Ticket::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        Ticket dispatchedDuplicate = similarActiveTickets.stream()
                .filter(other -> other.getStatus() == TicketStatus.ASSIGNED || other.getStatus() == TicketStatus.IN_PROGRESS)
                .findFirst()
                .orElse(null);
        if (dispatchedDuplicate != null) {
            String assignedTechnician = isBlank(dispatchedDuplicate.getAssignedTechnicianName()) ? "another technician" : dispatchedDuplicate.getAssignedTechnicianName();
            throw new IllegalArgumentException("A similar active ticket (#" + dispatchedDuplicate.getId() + ") is already owned by " + assignedTechnician + ". Reject or close the duplicate instead of dispatching a second technician.");
        }

        Ticket canonicalTicket = similarActiveTickets.stream().findFirst().orElse(null);
        if (canonicalTicket != null && shouldPreferCanonicalTicket(canonicalTicket, ticket)) {
            throw new IllegalArgumentException("A similar active ticket (#" + canonicalTicket.getId() + ") already exists for this issue. Assign the technician to that ticket and reject this duplicate to avoid splitting the same problem across multiple cases.");
        }
    }

    private boolean shouldPreferCanonicalTicket(Ticket canonicalTicket, Ticket currentTicket) {
        OffsetDateTime canonicalCreatedAt = canonicalTicket.getCreatedAt();
        OffsetDateTime currentCreatedAt = currentTicket.getCreatedAt();
        if (canonicalCreatedAt != null && currentCreatedAt != null && canonicalCreatedAt.isBefore(currentCreatedAt)) {
            return true;
        }
        if (canonicalCreatedAt != null && currentCreatedAt == null) {
            return true;
        }
        if (canonicalCreatedAt == null && currentCreatedAt != null) {
            return false;
        }
        Long canonicalId = canonicalTicket.getId();
        Long currentId = currentTicket.getId();
        if (canonicalId == null || currentId == null) {
            return false;
        }
        return canonicalId < currentId;
    }

    private boolean isLikelySameIncident(Ticket first, Ticket second) {
        if (first.getCategory() != second.getCategory()) {
            return false;
        }

        String firstResourceName = normalise(first.getResourceName());
        String secondResourceName = normalise(second.getResourceName());
        String firstResourceLocation = normalise(first.getResourceLocation());
        String secondResourceLocation = normalise(second.getResourceLocation());
        String firstIncidentLocation = normalise(first.getIncidentLocation());
        String secondIncidentLocation = normalise(second.getIncidentLocation());

        boolean sameResource = !firstResourceName.isBlank() && firstResourceName.equals(secondResourceName);
        boolean sameIncidentLocation = !firstIncidentLocation.isBlank() && firstIncidentLocation.equals(secondIncidentLocation);
        boolean sameBaseLocation = !firstResourceLocation.isBlank() && firstResourceLocation.equals(secondResourceLocation);
        if (!(sameResource || sameIncidentLocation || sameBaseLocation)) {
            return false;
        }

        Set<String> firstKeywords = extractKeywords(first.getTitle(), first.getDescription(), first.getOperationalImpact());
        Set<String> secondKeywords = extractKeywords(second.getTitle(), second.getDescription(), second.getOperationalImpact());
        Set<String> sharedKeywords = new LinkedHashSet<>(firstKeywords);
        sharedKeywords.retainAll(secondKeywords);
        return sameIncidentLocation || !sharedKeywords.isEmpty();
    }

    private void ensureStatusPermission(Ticket ticket, String actorId, UserRole actorRole, TicketStatus nextStatus) {
        if (nextStatus == TicketStatus.IN_PROGRESS || nextStatus == TicketStatus.RESOLVED) {
            if (actorId == null || !actorId.equals(ticket.getAssignedTechnicianId())) {
                throw new SecurityException("Only the assigned technician can move active ticket work forward.");
            }
            return;
        }

        if (actorRole == UserRole.ADMIN) {
            if (nextStatus != TicketStatus.REJECTED) {
                throw new SecurityException("Admins can only reject tickets. Assignment is the admin workflow action for active cases.");
            }
            return;
        }
        if (nextStatus == TicketStatus.REJECTED) {
            throw new SecurityException("Only admins can reject tickets from the incident desk.");
        }
        throw new SecurityException("Unsupported ticket status action for this role.");
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

    @Transactional(readOnly = true)
    public List<DuplicateTicketMatchResponse> findPossibleDuplicates(DuplicateTicketCheckRequest request, AuthUserPrincipal principal) {
        UserRole actorRole = resolveCurrentRole(principal);
        validateDuplicateCheckRequest(request);

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime recentThreshold = now.minusDays(14);
        String requestResourceName = normalise(request.resourceName());
        String requestResourceLocation = normalise(request.resourceLocation());
        String requestIncidentLocation = normalise(request.incidentLocation());
        Set<String> requestKeywords = extractKeywords(request.title(), request.description(), request.operationalImpact());

        return ticketRepository.findAll().stream()
                .filter(ticket -> request.excludeTicketId() == null || !Objects.equals(ticket.getId(), request.excludeTicketId()))
                .filter(ticket -> ACTIVE_DUPLICATE_STATUSES.contains(ticket.getStatus()))
                .filter(ticket -> ticket.getUpdatedAt() != null && !ticket.getUpdatedAt().isBefore(recentThreshold))
                .map(ticket -> buildDuplicateMatch(ticket, principal.getPublicId(), actorRole, requestResourceName, requestResourceLocation, requestIncidentLocation, request.category(), requestKeywords, now))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(DuplicateTicketMatchResponse::matchScore).reversed()
                        .thenComparing(DuplicateTicketMatchResponse::updatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .toList();
    }

    private DuplicateTicketMatchResponse buildDuplicateMatch(Ticket ticket,
                                                             String actorId,
                                                             UserRole actorRole,
                                                             String requestResourceName,
                                                             String requestResourceLocation,
                                                             String requestIncidentLocation,
                                                             com.smartcampus.modulec.domain.TicketCategory requestCategory,
                                                             Set<String> requestKeywords,
                                                             OffsetDateTime now) {
        if (ticket.getCategory() != requestCategory) {
            return null;
        }

        String ticketResourceName = normalise(ticket.getResourceName());
        String ticketResourceLocation = normalise(ticket.getResourceLocation());
        String ticketIncidentLocation = normalise(ticket.getIncidentLocation());

        boolean sameResource = requestResourceName.equals(ticketResourceName);
        boolean sameIncidentLocation = !requestIncidentLocation.isBlank() && requestIncidentLocation.equals(ticketIncidentLocation);
        boolean sameBaseLocation = !requestResourceLocation.isBlank() && requestResourceLocation.equals(ticketResourceLocation);

        if (!(sameResource || sameIncidentLocation || sameBaseLocation)) {
            return null;
        }

        Set<String> ticketKeywords = extractKeywords(ticket.getTitle(), ticket.getDescription(), ticket.getOperationalImpact());
        Set<String> sharedKeywords = new LinkedHashSet<>(requestKeywords);
        sharedKeywords.retainAll(ticketKeywords);

        if (!requestKeywords.isEmpty() && sharedKeywords.isEmpty() && !sameIncidentLocation) {
            return null;
        }

        int score = 0;
        List<String> reasons = new ArrayList<>();

        if (sameResource) {
            score += 55;
            reasons.add("Same resource");
        }
        if (sameIncidentLocation) {
            score += 18;
            reasons.add("Same exact incident location");
        } else if (sameBaseLocation) {
            score += 10;
            reasons.add("Same asset base location");
        }

        score += 15;
        reasons.add("Same category");

        if (!sharedKeywords.isEmpty()) {
            score += Math.min(24, sharedKeywords.size() * 8);
            reasons.add("Shared keywords: " + String.join(", ", sharedKeywords.stream().limit(3).toList()));
        }

        if (ticket.getUpdatedAt() != null) {
            if (!ticket.getUpdatedAt().isBefore(now.minusDays(3))) {
                score += 15;
                reasons.add("Updated within the last 3 days");
            } else if (!ticket.getUpdatedAt().isBefore(now.minusDays(7))) {
                score += 10;
                reasons.add("Updated within the last week");
            } else {
                score += 5;
                reasons.add("Updated within the last 14 days");
            }
        }

        if (score < 65) {
            return null;
        }

        boolean viewable = canViewDuplicate(actorId, actorRole, ticket);
        return new DuplicateTicketMatchResponse(
                ticket.getId(),
                ticket.getTitle(),
                ticket.getStatus(),
                ticket.getResourceName(),
                ticket.getIncidentLocation() == null || ticket.getIncidentLocation().isBlank() ? ticket.getResourceLocation() : ticket.getIncidentLocation(),
                ticket.getUpdatedAt(),
                score,
                reasons,
                viewable
        );
    }

    private boolean canViewDuplicate(String actorId, UserRole actorRole, Ticket ticket) {
        if (actorRole == UserRole.ADMIN) {
            return true;
        }
        if (Objects.equals(actorId, ticket.getReporterId())) {
            return true;
        }
        return actorRole == UserRole.TECHNICIAN
                && Objects.equals(actorId, ticket.getAssignedTechnicianId());
    }

    private UserRole resolveCurrentRole(AuthUserPrincipal principal) {
        return authUserRepository.findByPublicId(principal.getPublicId())
                .map(AuthUser::getRole)
                .orElse(principal.getRole());
    }

    private void validateDuplicateCheckRequest(DuplicateTicketCheckRequest request) {
        if (isBlank(request.resourceName()) || isBlank(request.resourceLocation()) || isBlank(request.incidentLocation())) {
            throw new IllegalArgumentException("Resource and location context are required for duplicate detection.");
        }
    }

    private Set<String> extractKeywords(String... values) {
        return java.util.Arrays.stream(values)
                .filter(Objects::nonNull)
                .flatMap(value -> java.util.Arrays.stream(value.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")))
                .map(String::trim)
                .filter(token -> token.length() >= 4)
                .filter(token -> !DUPLICATE_STOP_WORDS.contains(token))
                .collect(Collectors.toCollection(LinkedHashSet::new));
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

    private void validateEvidenceLabels(List<String> evidenceLabels) {
        if (evidenceLabels == null) {
            return;
        }
        if (evidenceLabels.size() > 3) {
            throw new IllegalArgumentException("Only up to 3 evidence references are allowed.");
        }
        Set<String> uniqueLabels = evidenceLabels.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(label -> !label.isBlank())
                .map(label -> label.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
        long nonBlankCount = evidenceLabels.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(label -> !label.isBlank())
                .count();
        if (uniqueLabels.size() != nonBlankCount) {
            throw new IllegalArgumentException("Evidence references must be unique.");
        }
    }

    private void appendEvidenceLabels(Ticket ticket, List<String> evidenceLabels) {
        if (evidenceLabels == null) {
            return;
        }
        evidenceLabels.stream()
                .filter(Objects::nonNull)
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

    private void validateSingleEvidenceUpload(String evidenceLabel, String evidenceDataUrl) {
        boolean hasLabel = !isBlank(evidenceLabel);
        boolean hasData = !isBlank(evidenceDataUrl);
        if (!hasLabel && !hasData) {
            return;
        }
        if (!hasLabel || !hasData) {
            throw new IllegalArgumentException("Upload one complete photo or continue without a photo.");
        }
        if (evidenceLabel.trim().length() > 255) {
            throw new IllegalArgumentException("Photo name must be 255 characters or fewer.");
        }
        String normalizedDataUrl = evidenceDataUrl.trim();
        if (!normalizedDataUrl.startsWith("data:image/")) {
            throw new IllegalArgumentException("Only image uploads are allowed for still-broken confirmation.");
        }
        if (!normalizedDataUrl.contains(";base64,")) {
            throw new IllegalArgumentException("Image upload is incomplete. Please choose the photo again.");
        }
        if (normalizedDataUrl.length() > 2_500_000) {
            throw new IllegalArgumentException("Photo is too large. Please upload a smaller image.");
        }
    }

    private void appendReopenEvidence(Ticket ticket, String evidenceLabel, String evidenceDataUrl) {
        if (isBlank(evidenceLabel) || isBlank(evidenceDataUrl)) {
            return;
        }
        TicketEvidence evidence = new TicketEvidence();
        evidence.setTicket(ticket);
        evidence.setLabel(evidenceLabel.trim());
        evidence.setReferenceUrl(evidenceDataUrl.trim());
        ticket.getEvidenceItems().add(evidence);
    }

    private String buildReopenDetail(String note, String evidenceLabel) {
        if (isBlank(evidenceLabel)) {
            return note.trim();
        }
        return note.trim() + " Photo attached: " + evidenceLabel.trim() + ".";
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
        return map(ticket, countSimilarOpenIncidents(ticket), true);
    }

    private TicketResponse map(Ticket ticket, long similarOpenIncidents, boolean includeDiscussion) {
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
                includeDiscussion
                        ? ticket.getActivities().stream()
                        .map(activity -> new TicketActivityResponse(
                                activity.getId(),
                                activity.getActorName(),
                                activity.getActorRole(),
                                activity.getAction(),
                                activity.getDetail(),
                                activity.getCreatedAt()))
                        .toList()
                        : List.of(),
                includeDiscussion ? ticket.getComments().stream().map(this::mapComment).toList() : List.of(),
                similarOpenIncidents,
                completenessScore,
                smartPriorityScore,
                smartPriorityLabel,
                responseTarget
        );
    }

    private Map<Long, Long> buildSimilarOpenIncidentCounts(List<Ticket> tickets) {
        Map<String, Long> activeResourceCounts = new HashMap<>();
        Map<String, Long> activeCategoryCounts = new HashMap<>();
        Map<String, Long> activeResourceCategoryCounts = new HashMap<>();
        Map<Long, Long> counts = new HashMap<>();

        for (Ticket ticket : tickets) {
            if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.REJECTED) {
                continue;
            }

            String resourceKey = normalise(ticket.getResourceName());
            String categoryKey = ticket.getCategory().name();
            String resourceCategoryKey = resourceCategoryKey(resourceKey, categoryKey);

            activeResourceCounts.merge(resourceKey, 1L, Long::sum);
            activeCategoryCounts.merge(categoryKey, 1L, Long::sum);
            activeResourceCategoryCounts.merge(resourceCategoryKey, 1L, Long::sum);
        }

        for (Ticket ticket : tickets) {
            String resourceKey = normalise(ticket.getResourceName());
            String categoryKey = ticket.getCategory().name();
            String resourceCategoryKey = resourceCategoryKey(resourceKey, categoryKey);

            long similarCount = activeResourceCounts.getOrDefault(resourceKey, 0L)
                    + activeCategoryCounts.getOrDefault(categoryKey, 0L)
                    - activeResourceCategoryCounts.getOrDefault(resourceCategoryKey, 0L);

            if (ticket.getStatus() != TicketStatus.CLOSED && ticket.getStatus() != TicketStatus.REJECTED) {
                similarCount--;
            }

            counts.put(ticket.getId(), Math.max(similarCount, 0L));
        }

        return counts;
    }

    private long countSimilarOpenIncidents(Ticket ticket) {
        return buildSimilarOpenIncidentCounts(ticketRepository.findAll())
                .getOrDefault(ticket.getId(), 0L);
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

    private String resourceCategoryKey(String resourceKey, String categoryKey) {
        return resourceKey + "\u0000" + categoryKey;
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
