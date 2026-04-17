package com.smartcampus.modulec.config;

import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketActivity;
import com.smartcampus.modulec.domain.TicketCategory;
import com.smartcampus.modulec.domain.TicketEvidence;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.repository.TicketRepository;
import java.time.OffsetDateTime;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SeedConfig {

    private static final String MAIN_AUDITORIUM_LOCATION = "Building B, Floor 1";

    @Bean
    CommandLineRunner seedModuleCData(TicketRepository ticketRepository) {
        return args -> {
            ticketRepository.findAll().stream()
                    .filter(ticket -> "Main Auditorium".equals(ticket.getResourceName()))
                    .forEach(ticket -> {
                        if (!MAIN_AUDITORIUM_LOCATION.equals(ticket.getResourceLocation())) {
                            ticket.setResourceLocation(MAIN_AUDITORIUM_LOCATION);
                        }
                        if (ticket.getIncidentLocation() == null || ticket.getIncidentLocation().isBlank() || "Building A, Floor 1".equals(ticket.getIncidentLocation())) {
                            ticket.setIncidentLocation(MAIN_AUDITORIUM_LOCATION);
                        }
                        ticketRepository.save(ticket);
                    });

            if (ticketRepository.count() > 0) {
                return;
            }

            Ticket projector = buildTicket(
                    "Projector outage in Auditorium B",
                    "Projector lamp flickers, shuts down after 5 minutes, and blocks afternoon presentation sessions.",
                    TicketCategory.EQUIPMENT,
                    TicketPriority.HIGH,
                    TicketStatus.IN_PROGRESS,
                    "student-01",
                    "Amaya Perera",
                    "amaya@campus.edu",
                    UserRole.STUDENT,
                    "4K Projector Unit B",
                    "Auditorium B",
                    "EQUIPMENT",
                    "student@campus.edu",
                    "Presentation sessions interrupted",
                    "Photo and short video captured during failure.",
                    "tech-17",
                    "Kasun Silva",
                    "Lamp assembly diagnosed; replacement stock requested.");
            projector.getEvidenceItems().add(evidence(projector, "projector-front.jpg"));
            projector.getEvidenceItems().add(evidence(projector, "projector-lamp-video.mp4"));
            projector.getActivities().add(activity(projector, "Amaya Perera", UserRole.STUDENT, "TICKET_CREATED", "Issue reported with evidence references."));
            projector.getActivities().add(activity(projector, "Operations Desk", UserRole.ADMIN, "TECHNICIAN_ASSIGNED", "Assigned to Kasun Silva for equipment inspection."));
            projector.getActivities().add(activity(projector, "Kasun Silva", UserRole.TECHNICIAN, "STATUS_UPDATED", "Diagnosis started and temporary workaround failed."));

            Ticket ac = buildTicket(
                    "AC instability in Robotics Lab",
                    "The lab AC drops after midday and makes the room unsuitable for practical sessions.",
                    TicketCategory.FACILITY,
                    TicketPriority.MEDIUM,
                    TicketStatus.OPEN,
                    "staff-07",
                    "Lahiru Fernando",
                    "lahiru@campus.edu",
                    UserRole.STAFF,
                    "Advanced Robotics Lab",
                    "Science Wing, Room 302",
                    "LAB",
                    "labassistant@campus.edu",
                    "Afternoon lab sessions affected",
                    "Vent photo and temperature note provided.",
                    null,
                    null,
                    null);
            ac.getEvidenceItems().add(evidence(ac, "lab-ac-vent-photo.jpg"));
            ac.getActivities().add(activity(ac, "Lahiru Fernando", UserRole.STAFF, "TICKET_CREATED", "Thermal comfort issue reported for lab sessions."));

            Ticket network = buildTicket(
                    "Network drops during auditorium playback",
                    "Auditorium media network disconnects during video playback and impacts event delivery.",
                    TicketCategory.NETWORK,
                    TicketPriority.CRITICAL,
                    TicketStatus.TRIAGED,
                    "events-02",
                    "Campus Events Desk",
                    "events@campus.edu",
                    UserRole.STAFF,
                    "Main Auditorium",
                    MAIN_AUDITORIUM_LOCATION,
                    "LECTURE_HALL",
                    "events@campus.edu",
                    "Large public events affected",
                    "Logs exported from media console and network switch.",
                    null,
                    null,
                    null);
            network.setIncidentLocation(MAIN_AUDITORIUM_LOCATION);
            network.getEvidenceItems().add(evidence(network, "network-drop-log.txt"));
            network.getActivities().add(activity(network, "Campus Events Desk", UserRole.STAFF, "TICKET_CREATED", "High-impact event connectivity issue reported."));
            network.getActivities().add(activity(network, "Operations Desk", UserRole.ADMIN, "STATUS_UPDATED", "Ticket triaged as critical due to event impact."));

            ticketRepository.save(projector);
            ticketRepository.save(ac);
            ticketRepository.save(network);
        };
    }

    private Ticket buildTicket(String title, String description, TicketCategory category, TicketPriority priority,
                               TicketStatus status, String reporterId, String reporterName, String reporterEmail,
                               UserRole reporterRole, String resourceName, String resourceLocation, String resourceType,
                               String preferredContact, String operationalImpact, String evidenceNotes,
                               String technicianId, String technicianName, String resolutionNotes) {
        OffsetDateTime now = OffsetDateTime.now();
        Ticket ticket = new Ticket();
        ticket.setTitle(title);
        ticket.setDescription(description);
        ticket.setCategory(category);
        ticket.setPriority(priority);
        ticket.setStatus(status);
        ticket.setReporterId(reporterId);
        ticket.setReporterName(reporterName);
        ticket.setReporterEmail(reporterEmail);
        ticket.setReporterRole(reporterRole);
        ticket.setResourceName(resourceName);
        ticket.setResourceLocation(resourceLocation);
        ticket.setIncidentLocation(resourceLocation);
        ticket.setResourceType(resourceType);
        ticket.setPreferredContact(preferredContact);
        ticket.setOperationalImpact(operationalImpact);
        ticket.setEvidenceNotes(evidenceNotes);
        ticket.setAssignedTechnicianId(technicianId);
        ticket.setAssignedTechnicianName(technicianName);
        ticket.setResolutionNotes(resolutionNotes);
        ticket.setCreatedAt(now.minusDays(1));
        ticket.setUpdatedAt(now);
        return ticket;
    }

    private TicketEvidence evidence(Ticket ticket, String label) {
        TicketEvidence evidence = new TicketEvidence();
        evidence.setTicket(ticket);
        evidence.setLabel(label);
        return evidence;
    }

    private TicketActivity activity(Ticket ticket, String actorName, UserRole actorRole, String action, String detail) {
        TicketActivity activity = new TicketActivity();
        activity.setTicket(ticket);
        activity.setActorName(actorName);
        activity.setActorRole(actorRole);
        activity.setAction(action);
        activity.setDetail(detail);
        activity.setCreatedAt(OffsetDateTime.now());
        return activity;
    }
}
