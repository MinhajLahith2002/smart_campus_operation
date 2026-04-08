package com.smartcampus.modulec.service;

import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketActivity;
import com.smartcampus.modulec.domain.TicketEvidence;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.dto.AssignTechnicianRequest;
import com.smartcampus.modulec.dto.CreateTicketRequest;
import com.smartcampus.modulec.dto.TicketActivityResponse;
import com.smartcampus.modulec.dto.TicketQuery;
import com.smartcampus.modulec.dto.TicketResponse;
import com.smartcampus.modulec.dto.TicketSummaryResponse;
import com.smartcampus.modulec.dto.UpdateTicketStatusRequest;
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

    public TicketService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
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
            request.evidenceLabels().forEach(label -> {
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
        ticket.setAssignedTechnicianId(request.technicianId());
        ticket.setAssignedTechnicianName(request.technicianName());
        if (ticket.getStatus() == TicketStatus.OPEN || ticket.getStatus() == TicketStatus.TRIAGED) {
            ticket.setStatus(TicketStatus.ASSIGNED);
        }
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket,
                request.actorName() == null || request.actorName().isBlank() ? "Operations Desk" : request.actorName(),
                UserRole.ADMIN,
                "TECHNICIAN_ASSIGNED",
                "Assigned to " + request.technicianName() + " (" + request.technicianId() + ").");

        return map(ticketRepository.save(ticket));
    }

    public TicketResponse updateStatus(Long ticketId, UpdateTicketStatusRequest request) {
        Ticket ticket = findTicket(ticketId);
        ticket.setStatus(request.status());
        if (request.resolutionNotes() != null && !request.resolutionNotes().isBlank()) {
            ticket.setResolutionNotes(request.resolutionNotes());
        }
        ticket.setUpdatedAt(OffsetDateTime.now());

        addActivity(ticket,
                request.actorName() == null || request.actorName().isBlank() ? "Module C Desk" : request.actorName(),
                resolveActorRole(request.status()),
                "STATUS_UPDATED",
                request.detail() == null || request.detail().isBlank()
                        ? "Ticket moved to " + request.status().name() + "."
                        : request.detail());

        return map(ticketRepository.save(ticket));
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

    private boolean matchesRoleScope(Ticket ticket, TicketQuery query) {
        if (query.requesterRole() == UserRole.ADMIN) {
            return true;
        }
        if (query.requesterRole() == UserRole.TECHNICIAN) {
            return query.requesterId() == null || query.requesterId().equals(ticket.getAssignedTechnicianId());
        }
        return query.requesterId() != null && query.requesterId().equals(ticket.getReporterId());
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

    private UserRole resolveActorRole(TicketStatus status) {
        return switch (status) {
            case IN_PROGRESS, RESOLVED, CLOSED -> UserRole.TECHNICIAN;
            default -> UserRole.ADMIN;
        };
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
                        .toList()
        );
    }
}
