package com.smartcampus.modulec.config;

import com.smartcampus.operationshub.facilities.domain.AvailabilityWindow;
import com.smartcampus.operationshub.facilities.domain.FacilityAsset;
import com.smartcampus.operationshub.facilities.domain.ResourceStatus;
import com.smartcampus.operationshub.facilities.domain.ResourceType;
import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketActivity;
import com.smartcampus.modulec.domain.TicketCategory;
import com.smartcampus.modulec.domain.TicketEvidence;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.facilities.repository.FacilityAssetRepository;
import com.smartcampus.modulec.repository.TicketRepository;
import java.time.OffsetDateTime;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SeedConfig {

    private static final String MAIN_AUDITORIUM_LOCATION = "Building B, Floor 1";

    @Bean
    CommandLineRunner seedModuleData(TicketRepository ticketRepository, FacilityAssetRepository facilityAssetRepository) {
        return args -> {
            seedResources(facilityAssetRepository);

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

    private void seedResources(FacilityAssetRepository facilityAssetRepository) {
        if (facilityAssetRepository.count() > 0) {
            return;
        }

        facilityAssetRepository.save(buildResource(
                "Main Auditorium",
                ResourceType.HALL,
                500,
                "Building A, Floor 1",
                "Large auditorium with event-grade audio visual support for ceremonies, lectures, and campus showcases.",
                "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800",
                ResourceStatus.ACTIVE,
                availability("Monday,Tuesday,Wednesday,Thursday,Friday,Saturday", "08:00", "22:00", "AV support should be requested for large events.")
        ));
        facilityAssetRepository.save(buildResource(
                "Advanced Robotics Lab",
                ResourceType.LAB,
                30,
                "Science Wing, Room 302",
                "Lab with robotics benches, high-spec workstations, and guided practical support for engineering cohorts.",
                "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
                ResourceStatus.ACTIVE,
                availability("Monday,Tuesday,Wednesday,Thursday,Friday", "09:00", "18:00", "Department approval is required outside scheduled practicals.")
        ));
        facilityAssetRepository.save(buildResource(
                "Collaborative Space 1",
                ResourceType.MEETING_ROOM,
                12,
                "Library, Level 2",
                "Small meeting room for presentations, group study, and project planning sessions.",
                "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
                ResourceStatus.ACTIVE,
                availability("Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday", "07:00", "23:00", "Whiteboard and shared display are available in-room.")
        ));
        facilityAssetRepository.save(buildResource(
                "4K Projector Unit B",
                ResourceType.EQUIPMENT,
                1,
                "IT Helpdesk",
                "Portable high-resolution projector for classroom delivery and event support.",
                "https://images.unsplash.com/photo-1535016120720-40c646bebb3d?auto=format&fit=crop&q=80&w=800",
                ResourceStatus.OUT_OF_SERVICE,
                availability("Monday,Tuesday,Wednesday,Thursday,Friday", "08:00", "17:00", "Currently unavailable while the lamp assembly is replaced.")
        ));
    }

    private FacilityAsset buildResource(String name, ResourceType type, int capacity, String location, String description,
                                        String imageUrl, ResourceStatus status, AvailabilityWindow availabilityWindow) {
        OffsetDateTime now = OffsetDateTime.now();
        FacilityAsset resource = new FacilityAsset();
        resource.setName(name);
        resource.setType(type);
        resource.setCapacity(capacity);
        resource.setLocation(location);
        resource.setDescription(description);
        resource.setImageUrl(imageUrl);
        resource.setStatus(status);
        resource.setAvailabilityWindow(availabilityWindow);
        resource.setCreatedAt(now.minusDays(2));
        resource.setUpdatedAt(now);
        return resource;
    }

    private AvailabilityWindow availability(String daysOfWeek, String openTime, String closeTime, String notes) {
        AvailabilityWindow window = new AvailabilityWindow();
        window.setDaysOfWeek(daysOfWeek);
        window.setOpenTime(openTime);
        window.setCloseTime(closeTime);
        window.setNotes(notes);
        return window;
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
