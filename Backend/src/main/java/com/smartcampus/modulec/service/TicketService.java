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
import com.smartcampus.modulec.repository.TicketRepository;
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

    public TicketService(TicketRepository ticketRepository, TicketCommentRepository ticketCommentRepository) {
        this.ticketRepository = ticketRepository;
        this.ticketCommentRepository = ticketCommentRepository;
    }

    public TicketResponse createTicket(CreateTicketRequest request) {
        OffsetDateTime now = OffsetDateTime.now();

        Ticket ticket = new Ticket();
        ticket.setTitle(request.title());
        ticket.setDescription(request.description());
        ticket.setCategory(request.category());
        ticket.setPriority(request.priority());
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setReporterId(request.reporterId());
        ticket.setReporterName(request.reporterName());
        ticket.setReporterEmail(request.reporterEmail());
        ticket.setReporterRole(request.reporterRole());
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

        addActivity(ticket, request.reporterName(), request.reporterRole(), "TICKET_CREATED",
                "Ticket logged with resource, incident description, and evidence references.");

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
    public TicketResponse getTicket(Long ticketId) {
        return map(findTicket(ticketId));
    }

    public TicketResponse assignTechnician(Long ticketId, AssignTechnicianRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureAdmin(request.actorRole(), "Only admins can assign technicians.");

        ticket.setAssignedTechnicianId(request.technicianId());
        ticket.setAssignedTechnicianName(request.technicianName());
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket,
                fallbackActorName(request.actorName(), "Operations Desk"),
                request.actorRole(),
                "TECHNICIAN_ASSIGNED",
                "Assigned to " + request.technicianName() + " (" + request.technicianId() + ").");

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse updateStatus(Long ticketId, UpdateTicketStatusRequest request) {
        Ticket ticket = findTicket(ticketId);
        TicketStatus currentStatus = ticket.getStatus();
        TicketStatus nextStatus = request.status();

        ensureStatusPermission(ticket, request.actorId(), request.actorRole(), nextStatus);

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
                fallbackActorName(request.actorName(), "Module C Desk"),
                request.actorRole(),
                "STATUS_UPDATED",
                request.detail() == null || request.detail().isBlank()
                        ? "Ticket moved to " + nextStatus.name() + "."
                        : request.detail());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse closeTicket(Long ticketId, TicketDecisionRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureReporterOrAdmin(ticket, request.actorId(), request.actorRole(), "Only the reporter or an admin can close this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be closed.");
        }

        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setUpdatedAt(OffsetDateTime.now());
        addActivity(ticket,
                fallbackActorName(request.actorName(), "Ticket Reporter"),
                request.actorRole(),
                "TICKET_CLOSED",
                request.note() == null || request.note().isBlank()
                        ? "Resolution confirmed and ticket closed."
                        : request.note());

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse reopenTicket(Long ticketId, TicketDecisionRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureReporterOrAdmin(ticket, request.actorId(), request.actorRole(), "Only the reporter or an admin can reopen this ticket.");
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only resolved tickets can be reopened.");
        }
        if (request.note() == null || request.note().isBlank()) {
            throw new IllegalArgumentException("A reopen note is required when reporting the issue as still broken.");
        }

        ticket.setStatus(TicketStatus.OPEN);
        ticket.setUpdatedAt(OffsetDateTime.now());
        addActivity(ticket,
                fallbackActorName(request.actorName(), "Ticket Reporter"),
                request.actorRole(),
                "TICKET_REOPENED",
                request.note());

        return map(ticketRepository.save(ticket));
    }

    public TicketCommentResponse addComment(Long ticketId, TicketCommentRequest request) {
        Ticket ticket = findTicket(ticketId);
        ensureCanView(ticket, request.actorId(), request.actorRole(), "You cannot comment on this ticket.");
        ensureCommentable(ticket);

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthorId(request.actorId());
        comment.setAuthorName(request.actorName());
        comment.setAuthorRole(request.actorRole());
        comment.setBody(request.body().trim());
        comment.setCreatedAt(OffsetDateTime.now());
        comment.setUpdatedAt(comment.getCreatedAt());
        comment.setEdited(false);
        comment.setDeleted(false);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, request.actorName(), request.actorRole(), "COMMENT_ADDED", "New comment added to the ticket discussion.");
        ticketRepository.save(ticket);
        TicketComment savedComment = ticketCommentRepository.save(comment);
        return mapComment(savedComment);
    }

    public TicketCommentResponse updateComment(Long commentId, TicketCommentRequest request) {
        TicketComment comment = findComment(commentId);
        Ticket ticket = comment.getTicket();
        ensureCommentable(ticket);
        ensureCanView(ticket, request.actorId(), request.actorRole(), "You cannot edit comments on this ticket.");
        if (!request.actorId().equals(comment.getAuthorId())) {
            throw new SecurityException("Only the comment owner can edit this comment.");
        }

        comment.setBody(request.body().trim());
        comment.setUpdatedAt(OffsetDateTime.now());
        comment.setEdited(true);
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket, request.actorName(), request.actorRole(), "COMMENT_EDITED", "A comment was edited by its owner.");
        ticketRepository.save(ticket);
        return mapComment(comment);
    }

    public void deleteComment(Long commentId, TicketDecisionRequest request) {
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

    private Ticket findTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket " + ticketId + " was not found."));
    }

    private TicketComment findComment(Long commentId) {
        return ticketCommentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment " + commentId + " was not found."));
    }

    private boolean matchesRoleScope(Ticket ticket, TicketQuery query) {
        if (query.requesterRole() == UserRole.ADMIN) {
            return true;
        }
        if (query.requesterRole() == UserRole.TECHNICIAN) {
            return query.requesterId() == null || query.requesterId().equals(ticket.getAssignedTechnicianId());
        }
        return query.requesterId() != null && query.requesterId().equals(ticket.getReporterId());
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

    private String fallbackActorName(String actorName, String fallback) {
        return actorName == null || actorName.isBlank() ? fallback : actorName;
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
