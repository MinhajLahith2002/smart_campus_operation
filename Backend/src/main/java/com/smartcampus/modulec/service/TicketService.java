package com.smartcampus.modulec.service;

import com.smartcampus.modulec.domain.AccountStatus;
import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketActivity;
import com.smartcampus.modulec.domain.TicketComment;
import com.smartcampus.modulec.domain.TicketEvidence;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.domain.AuthUser;
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
import com.smartcampus.modulec.repository.AuthUserRepository;
import com.smartcampus.modulec.repository.TicketCommentRepository;
import com.smartcampus.modulec.repository.TicketRepository;
import com.smartcampus.modulec.security.AuthUserPrincipal;
import jakarta.persistence.EntityNotFoundException;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final AuthUserRepository authUserRepository;

    public TicketService(TicketRepository ticketRepository,
                         TicketCommentRepository ticketCommentRepository,
                         AuthUserRepository authUserRepository) {
        this.ticketRepository = ticketRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.authUserRepository = authUserRepository;
    }

    public TicketResponse createTicket(CreateTicketRequest request, AuthUserPrincipal principal) {
        OffsetDateTime now = OffsetDateTime.now();

        Ticket ticket = new Ticket();
        ticket.setTitle(request.title());
        ticket.setDescription(request.description());
        ticket.setCategory(request.category());
        ticket.setPriority(request.priority());
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setReporterId(principal.getPublicId());
        ticket.setReporterName(principal.getFullName());
        ticket.setReporterEmail(principal.getEmail());
        ticket.setReporterRole(principal.getRole());
        ticket.setResourceName(request.resourceName());
        ticket.setResourceLocation(request.resourceLocation());
        ticket.setResourceType(request.resourceType());
        ticket.setPreferredContact(request.preferredContact());
        ticket.setOperationalImpact(request.operationalImpact());
        ticket.setEvidenceNotes(request.evidenceNotes());
        ticket.setCreatedAt(now);
        ticket.setUpdatedAt(now);

        if (request.evidenceLabels() != null) {
            request.evidenceLabels().stream().limit(3).forEach(label -> {
                TicketEvidence evidence = new TicketEvidence();
                evidence.setTicket(ticket);
                evidence.setLabel(label);
                ticket.getEvidenceItems().add(evidence);
            });
        }

        addActivity(ticket, principal.getFullName(), principal.getRole(), "TICKET_CREATED",
                "Ticket logged with resource, incident description, and evidence references.");

        return map(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTickets(TicketQuery query, AuthUserPrincipal principal) {
        return ticketRepository.findAll().stream()
                .filter(ticket -> matchesRoleScope(ticket, principal, query))
                .filter(ticket -> query.status() == null || ticket.getStatus().name().equalsIgnoreCase(query.status()))
                .filter(ticket -> query.priority() == null || ticket.getPriority().name().equalsIgnoreCase(query.priority()))
                .filter(ticket -> query.category() == null || ticket.getCategory().name().equalsIgnoreCase(query.category()))
                .sorted(Comparator.comparing(Ticket::getUpdatedAt).reversed())
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicket(Long ticketId, AuthUserPrincipal principal) {
        Ticket ticket = findTicket(ticketId);
        ensureCanView(ticket, principal.getPublicId(), principal.getRole(), "You cannot view this ticket.");
        return map(ticket);
    }

    public TicketResponse assignTechnician(Long ticketId, AssignTechnicianRequest request, AuthUserPrincipal principal) {
        Ticket ticket = findTicket(ticketId);
        ensureAdmin(principal.getRole(), "Only admins can assign technicians.");

        AuthUser technician = authUserRepository.findByPublicId(request.technicianId())
                .orElseThrow(() -> new IllegalArgumentException("Selected technician was not found."));
        if (technician.getRole() != UserRole.TECHNICIAN || technician.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("Selected technician is not available for assignment.");
        }

        ticket.setAssignedTechnicianId(technician.getPublicId());
        ticket.setAssignedTechnicianName(technician.getFullName());
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket,
                principal.getFullName(),
                principal.getRole(),
                "TECHNICIAN_ASSIGNED",
                "Assigned to " + technician.getFullName() + " (" + technician.getPublicId() + ").");

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse updateStatus(Long ticketId, UpdateTicketStatusRequest request, AuthUserPrincipal principal) {
        Ticket ticket = findTicket(ticketId);
        TicketStatus currentStatus = ticket.getStatus();
        TicketStatus nextStatus = request.status();

        ensureStatusPermission(ticket, principal.getPublicId(), principal.getRole(), nextStatus);

        if (nextStatus == TicketStatus.CLOSED || nextStatus == TicketStatus.OPEN) {
            throw new IllegalArgumentException("Use the close or reopen workflow for that transition.");
        }
        if (nextStatus == TicketStatus.RESOLVED && (request.resolutionNotes() == null || request.resolutionNotes().isBlank())) {
            throw new IllegalArgumentException("Resolution notes are required when resolving a ticket.");
        }
        if (nextStatus == TicketStatus.REJECTED && (request.detail() == null || request.detail().isBlank())) {
            throw new IllegalArgumentException("A rejection reason is required when rejecting a ticket.");
        }
        ensureTransitionAllowed(currentStatus, nextStatus);

        ticket.setStatus(nextStatus);
        if (request.resolutionNotes() != null && !request.resolutionNotes().isBlank()) {
            ticket.setResolutionNotes(request.resolutionNotes());
        }
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket,
                principal.getFullName(),
                principal.getRole(),
                "STATUS_UPDATED",
                request.detail() == null || request.detail().isBlank()
                        ? "Ticket moved to " + nextStatus.name() + "."
                        : request.detail());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse closeTicket(Long ticketId, TicketDecisionRequest request, AuthUserPrincipal principal) {
        Ticket ticket = findTicket(ticketId);
        ensureReporterOrAdmin(ticket, principal.getPublicId(), principal.getRole(), "Only the reporter or an admin can close this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be closed.");
        }

        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setUpdatedAt(OffsetDateTime.now());
        addActivity(ticket,
                principal.getFullName(),
                principal.getRole(),
                "TICKET_CLOSED",
                request.note() == null || request.note().isBlank()
                        ? "Resolution confirmed and ticket closed."
                        : request.note());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse reopenTicket(Long ticketId, TicketDecisionRequest request, AuthUserPrincipal principal) {
        Ticket ticket = findTicket(ticketId);
        ensureReporterOrAdmin(ticket, principal.getPublicId(), principal.getRole(), "Only the reporter or an admin can reopen this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be reopened.");
        }
        if (request.note() == null || request.note().isBlank()) {
            throw new IllegalArgumentException("A reopen note is required when reporting the issue as still broken.");
        }

        ticket.setStatus(TicketStatus.OPEN);
        ticket.setUpdatedAt(OffsetDateTime.now());
        addActivity(ticket,
                principal.getFullName(),
                principal.getRole(),
                "TICKET_REOPENED",
                request.note());

        return map(ticketRepository.save(ticket));
    }

    public TicketCommentResponse addComment(Long ticketId, TicketCommentRequest request, AuthUserPrincipal principal) {
        Ticket ticket = findTicket(ticketId);
        ensureCanView(ticket, principal.getPublicId(), principal.getRole(), "You cannot comment on this ticket.");
        ensureCommentable(ticket);

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

        addActivity(ticket, principal.getFullName(), principal.getRole(), "COMMENT_ADDED", "New comment added to the ticket discussion.");
        ticketRepository.save(ticket);
        TicketComment savedComment = ticketCommentRepository.save(comment);
        return mapComment(savedComment);
    }

    public TicketCommentResponse updateComment(Long commentId, TicketCommentRequest request, AuthUserPrincipal principal) {
        TicketComment comment = findComment(commentId);
        Ticket ticket = comment.getTicket();
        ensureCommentable(ticket);
        ensureCanView(ticket, principal.getPublicId(), principal.getRole(), "You cannot edit comments on this ticket.");
        if (!principal.getPublicId().equals(comment.getAuthorId())) {
            throw new SecurityException("Only the comment owner can edit this comment.");
        }

        comment.setBody(request.body().trim());
        comment.setUpdatedAt(OffsetDateTime.now());
        comment.setEdited(true);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, principal.getFullName(), principal.getRole(), "COMMENT_EDITED", "A comment was edited by its owner.");
        ticketRepository.save(ticket);
        return mapComment(comment);
    }

    public void deleteComment(Long commentId, TicketDecisionRequest request, AuthUserPrincipal principal) {
        TicketComment comment = findComment(commentId);
        Ticket ticket = comment.getTicket();
        ensureCanView(ticket, principal.getPublicId(), principal.getRole(), "You cannot moderate this ticket discussion.");
        if (principal.getRole() != UserRole.ADMIN && !principal.getPublicId().equals(comment.getAuthorId())) {
            throw new SecurityException("Only the comment owner or an admin can delete this comment.");
        }

        comment.setDeleted(true);
        comment.setBody("Comment removed");
        comment.setUpdatedAt(OffsetDateTime.now());
        comment.setEdited(true);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, principal.getFullName(), principal.getRole(), "COMMENT_DELETED", "A comment was removed from the ticket discussion.");
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

    private Ticket findTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket " + ticketId + " was not found."));
    }

    private TicketComment findComment(Long commentId) {
        return ticketCommentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment " + commentId + " was not found."));
    }

    private boolean matchesRoleScope(Ticket ticket, AuthUserPrincipal principal, TicketQuery query) {
        if (principal.getRole() == UserRole.ADMIN) {
            return true;
        }
        if (principal.getRole() == UserRole.TECHNICIAN) {
            if (Boolean.parseBoolean(String.valueOf(query.assignedToMe()))) {
                return principal.getPublicId().equals(ticket.getAssignedTechnicianId());
            }
            return principal.getPublicId().equals(ticket.getAssignedTechnicianId());
        }
        return principal.getPublicId().equals(ticket.getReporterId());
    }

    private void ensureAdmin(UserRole actorRole, String message) {
        if (actorRole != UserRole.ADMIN) {
            throw new SecurityException(message);
        }
    }

    private void ensureReporterOrAdmin(Ticket ticket, String actorId, UserRole actorRole, String message) {
        if (actorRole == UserRole.ADMIN) {
            return;
        }
        if (actorId == null || !actorId.equals(ticket.getReporterId())) {
            throw new SecurityException(message);
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
            return;
        }
        if (actorRole != UserRole.TECHNICIAN) {
            throw new SecurityException("Only admins or the assigned technician can update ticket workflow.");
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
            case OPEN -> nextStatus == TicketStatus.IN_PROGRESS || nextStatus == TicketStatus.REJECTED;
            case TRIAGED, ASSIGNED -> nextStatus == TicketStatus.IN_PROGRESS || nextStatus == TicketStatus.REJECTED;
            case IN_PROGRESS -> nextStatus == TicketStatus.RESOLVED || nextStatus == TicketStatus.REJECTED;
            default -> false;
        };

        if (!allowed) {
            throw new IllegalArgumentException("Illegal ticket transition from " + currentStatus + " to " + nextStatus + ".");
        }
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
                ticket.getResourceType(),
                ticket.getPreferredContact(),
                ticket.getOperationalImpact(),
                ticket.getEvidenceNotes(),
                ticket.getResolutionNotes(),
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
                ticket.getComments().stream().map(this::mapComment).toList()
        );
    }
}
