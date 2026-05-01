package com.smartcampus.operationshub.config;

import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketActivity;
import com.smartcampus.modulec.domain.TicketCategory;
import com.smartcampus.modulec.domain.TicketComment;
import com.smartcampus.modulec.domain.TicketEvidence;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.repository.TicketRepository;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.bookings.domain.BookingRecord;
import com.smartcampus.operationshub.bookings.repository.BookingRecordRepository;
import com.smartcampus.operationshub.notifications.domain.NotificationEvent;
import com.smartcampus.operationshub.notifications.repository.NotificationEventRepository;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SeedIdentityAlignmentConfig {

    private static final String STUDENT_EMAIL = "student@campus.edu";
    private static final String STUDENT_TARGET_ID = "student-01";
    private static final Set<String> STUDENT_LEGACY_IDS = Set.of("sample-student", STUDENT_TARGET_ID);

    private static final String TECHNICIAN_EMAIL = "technician@campus.edu";
    private static final String TECHNICIAN_TARGET_ID = "tech-17";
    private static final Set<String> TECHNICIAN_LEGACY_IDS = Set.of("sample-technician", TECHNICIAN_TARGET_ID);

    private static final String ADMIN_EMAIL = "admin@campus.edu";
    private static final String ADMIN_FALLBACK_ID = "admin-1";
    private static final String ADMIN_FALLBACK_NAME = "Campus Operations Admin";

    @Bean
    CommandLineRunner alignSeedIdentityReferences(AuthUserRepository authUserRepository,
                                                  BookingRecordRepository bookingRecordRepository,
                                                  TicketRepository ticketRepository,
                                                  NotificationEventRepository notificationEventRepository) {
        return args -> {
            RoleIdentity student = alignStudent(authUserRepository, bookingRecordRepository, ticketRepository, notificationEventRepository);
            RoleIdentity technician = alignTechnician(authUserRepository, ticketRepository, notificationEventRepository);
            RoleIdentity admin = resolveIdentity(authUserRepository, ADMIN_EMAIL, ADMIN_FALLBACK_ID, UserRole.ADMIN, ADMIN_FALLBACK_NAME);

            syncTicketIdentityDetails(ticketRepository, student, technician);
            ensureRoleTicketPortfolio(ticketRepository, student, technician, admin);
        };
    }

    private RoleIdentity alignStudent(AuthUserRepository authUserRepository,
                                      BookingRecordRepository bookingRecordRepository,
                                      TicketRepository ticketRepository,
                                      NotificationEventRepository notificationEventRepository) {
        AuthUser student = authUserRepository.findByEmail(STUDENT_EMAIL).orElse(null);
        if (student != null && !STUDENT_TARGET_ID.equals(student.getPublicId())) {
            student.setPublicId(STUDENT_TARGET_ID);
            student = authUserRepository.save(student);
        }

        List<BookingRecord> bookings = bookingRecordRepository.findAll();
        boolean bookingChanged = false;
        for (BookingRecord booking : bookings) {
            String requesterEmail = normalize(booking.getRequesterEmail());
            if (STUDENT_EMAIL.equals(requesterEmail) || STUDENT_LEGACY_IDS.contains(normalize(booking.getRequesterId()))) {
                if (!STUDENT_TARGET_ID.equals(booking.getRequesterId())) {
                    booking.setRequesterId(STUDENT_TARGET_ID);
                    bookingChanged = true;
                }
            }
        }
        if (bookingChanged) {
            bookingRecordRepository.saveAll(bookings);
        }

        List<Ticket> tickets = distinctTickets(ticketRepository.findAll());
        boolean ticketChanged = false;
        for (Ticket ticket : tickets) {
            String reporterEmail = normalize(ticket.getReporterEmail());
            if (STUDENT_EMAIL.equals(reporterEmail) || STUDENT_LEGACY_IDS.contains(normalize(ticket.getReporterId()))) {
                if (!STUDENT_TARGET_ID.equals(ticket.getReporterId())) {
                    ticket.setReporterId(STUDENT_TARGET_ID);
                    ticketChanged = true;
                }
            }
        }
        if (ticketChanged) {
            ticketRepository.saveAll(tickets);
        }

        List<NotificationEvent> notifications = notificationEventRepository.findAll();
        boolean notificationChanged = false;
        for (NotificationEvent notification : notifications) {
            if (STUDENT_LEGACY_IDS.contains(normalize(notification.getUserId())) && !STUDENT_TARGET_ID.equals(notification.getUserId())) {
                notification.setUserId(STUDENT_TARGET_ID);
                notificationChanged = true;
            }
        }
        if (notificationChanged) {
            notificationEventRepository.saveAll(notifications);
        }

        return resolveIdentity(authUserRepository, STUDENT_EMAIL, STUDENT_TARGET_ID, UserRole.STUDENT, "Amaya Perera");
    }

    private RoleIdentity alignTechnician(AuthUserRepository authUserRepository,
                                         TicketRepository ticketRepository,
                                         NotificationEventRepository notificationEventRepository) {
        AuthUser technician = authUserRepository.findByEmail(TECHNICIAN_EMAIL).orElse(null);
        if (technician != null && !TECHNICIAN_TARGET_ID.equals(technician.getPublicId())) {
            technician.setPublicId(TECHNICIAN_TARGET_ID);
            technician = authUserRepository.save(technician);
        }

        List<Ticket> tickets = distinctTickets(ticketRepository.findAll());
        boolean ticketChanged = false;
        for (Ticket ticket : tickets) {
            if (TECHNICIAN_LEGACY_IDS.contains(normalize(ticket.getAssignedTechnicianId())) && !TECHNICIAN_TARGET_ID.equals(ticket.getAssignedTechnicianId())) {
                ticket.setAssignedTechnicianId(TECHNICIAN_TARGET_ID);
                ticketChanged = true;
            }
        }
        if (ticketChanged) {
            ticketRepository.saveAll(tickets);
        }

        List<NotificationEvent> notifications = notificationEventRepository.findAll();
        boolean notificationChanged = false;
        for (NotificationEvent notification : notifications) {
            if (TECHNICIAN_LEGACY_IDS.contains(normalize(notification.getUserId())) && !TECHNICIAN_TARGET_ID.equals(notification.getUserId())) {
                notification.setUserId(TECHNICIAN_TARGET_ID);
                notificationChanged = true;
            }
        }
        if (notificationChanged) {
            notificationEventRepository.saveAll(notifications);
        }

        return resolveIdentity(authUserRepository, TECHNICIAN_EMAIL, TECHNICIAN_TARGET_ID, UserRole.TECHNICIAN, "Kasun Silva");
    }

    private RoleIdentity resolveIdentity(AuthUserRepository authUserRepository,
                                         String email,
                                         String fallbackPublicId,
                                         UserRole fallbackRole,
                                         String fallbackName) {
        return authUserRepository.findByEmail(email)
                .map(user -> new RoleIdentity(user.getPublicId(), user.getFullName(), user.getEmail(), user.getRole()))
                .orElseGet(() -> new RoleIdentity(fallbackPublicId, fallbackName, email, fallbackRole));
    }

    private void syncTicketIdentityDetails(TicketRepository ticketRepository,
                                           RoleIdentity student,
                                           RoleIdentity technician) {
        List<Ticket> tickets = distinctTickets(ticketRepository.findAll());
        boolean changed = false;
        for (Ticket ticket : tickets) {
            if (student.publicId().equals(ticket.getReporterId())) {
                if (!student.name().equals(ticket.getReporterName())) {
                    ticket.setReporterName(student.name());
                    changed = true;
                }
                if (!student.email().equalsIgnoreCase(ticket.getReporterEmail())) {
                    ticket.setReporterEmail(student.email());
                    changed = true;
                }
                if (ticket.getReporterRole() != student.role()) {
                    ticket.setReporterRole(student.role());
                    changed = true;
                }
                if (ticket.getPreferredContact() == null || ticket.getPreferredContact().isBlank()) {
                    ticket.setPreferredContact(student.email());
                    changed = true;
                }
            }
            if (technician.publicId().equals(ticket.getAssignedTechnicianId())
                    && (ticket.getAssignedTechnicianName() == null || !technician.name().equals(ticket.getAssignedTechnicianName()))) {
                ticket.setAssignedTechnicianName(technician.name());
                changed = true;
            }
        }
        if (changed) {
            ticketRepository.saveAll(tickets);
        }
    }

    private void ensureRoleTicketPortfolio(TicketRepository ticketRepository,
                                           RoleIdentity student,
                                           RoleIdentity technician,
                                           RoleIdentity admin) {
        Set<String> existingTitles = new HashSet<>();
        ticketRepository.findAll().forEach(ticket -> existingTitles.add(normalize(ticket.getTitle())));

        OffsetDateTime now = OffsetDateTime.now();
        ensureTicket(ticketRepository, existingTitles, buildOpenTicket(student, now.minusDays(2)));
        ensureTicket(ticketRepository, existingTitles, buildAssignedTicket(student, technician, admin, now.minusHours(18)));
        ensureTicket(ticketRepository, existingTitles, buildInProgressTicket(student, technician, admin, now.minusHours(9)));
        ensureTicket(ticketRepository, existingTitles, buildResolvedTicket(student, technician, admin, now.minusDays(1)));
        ensureTicket(ticketRepository, existingTitles, buildClosedTicket(student, technician, admin, now.minusDays(4)));
        ensureTicket(ticketRepository, existingTitles, buildRejectedTicket(student, admin, now.minusDays(3)));
    }

    private void ensureTicket(TicketRepository ticketRepository, Set<String> existingTitles, Ticket ticket) {
        String titleKey = normalize(ticket.getTitle());
        if (existingTitles.contains(titleKey)) {
            return;
        }
        ticketRepository.save(ticket);
        existingTitles.add(titleKey);
    }

    private Ticket buildOpenTicket(RoleIdentity student, OffsetDateTime createdAt) {
        Ticket ticket = baseTicket(
                "Water leak reported near Library study zone",
                "Water is dripping from the ceiling near the library collaborative study area and the floor is becoming slippery for students moving between tables.",
                TicketCategory.FACILITY,
                TicketPriority.HIGH,
                TicketStatus.OPEN,
                student,
                "Collaborative Space 1",
                "Library, Level 2",
                "Library, Level 2 - East ceiling panel",
                null,
                null,
                "STUDY_SPACE",
                createdAt,
                createdAt.plusMinutes(15));
        ticket.setOperationalImpact("Study area seating is being blocked and there is a slip risk for nearby students.");
        ticket.setEvidenceNotes("ceiling-leak.jpg, wet-floor-closeup.png");
        addEvidence(ticket, "ceiling-leak.jpg", null);
        addEvidence(ticket, "wet-floor-closeup.png", null);
        addActivity(ticket, student.name(), student.role(), "TICKET_CREATED", "Reporter logged a new facility incident from the library study zone.", createdAt.plusMinutes(2));
        addComment(ticket, student.publicId(), student.name(), student.role(), "Leak started after the afternoon rain and is spreading toward the shared table area.", createdAt.plusMinutes(5));
        return ticket;
    }

    private Ticket buildAssignedTicket(RoleIdentity student, RoleIdentity technician, RoleIdentity admin, OffsetDateTime createdAt) {
        Ticket ticket = baseTicket(
                "Network dropouts in Advanced Robotics Lab",
                "The robotics lab control network disconnects every few minutes, interrupting sensor calibration and delaying the scheduled practical session.",
                TicketCategory.NETWORK,
                TicketPriority.HIGH,
                TicketStatus.ASSIGNED,
                student,
                "Advanced Robotics Lab",
                "Engineering Building, Floor 3",
                "Engineering Building, Floor 3 - Control bench A",
                2L,
                "Advanced Robotics Lab - 2026-04-18 - 13:00-15:00",
                "LAB",
                createdAt,
                createdAt.plusHours(3));
        ticket.setOperationalImpact("Students cannot complete the control systems practical until the network link becomes stable.");
        ticket.setEvidenceNotes("network-alert.png, controller-disconnect-log.txt");
        ticket.setAssignedTechnicianId(technician.publicId());
        ticket.setAssignedTechnicianName(technician.name());
        ticket.setAssignedByName(admin.name());
        ticket.setAssignedAt(createdAt.plusHours(2));
        addEvidence(ticket, "network-alert.png", null);
        addEvidence(ticket, "controller-disconnect-log.txt", null);
        addActivity(ticket, student.name(), student.role(), "TICKET_CREATED", "Reporter linked the incident to the lab booking and added evidence references.", createdAt.plusMinutes(3));
        addActivity(ticket, admin.name(), admin.role(), "TECHNICIAN_ASSIGNED", "Admin assigned the network issue to " + technician.name() + ".", createdAt.plusHours(2));
        addComment(ticket, admin.publicId(), admin.name(), admin.role(), "Prioritised for the afternoon lab since the session is already delayed.", createdAt.plusHours(2).plusMinutes(8));
        return ticket;
    }

    private Ticket buildInProgressTicket(RoleIdentity student, RoleIdentity technician, RoleIdentity admin, OffsetDateTime createdAt) {
        Ticket ticket = baseTicket(
                "Projector outage in Main Auditorium",
                "The main auditorium projector powers off during active presentations and blocks the booked guest lecture from continuing normally.",
                TicketCategory.EQUIPMENT,
                TicketPriority.HIGH,
                TicketStatus.IN_PROGRESS,
                student,
                "Main Auditorium",
                "Building B, Floor 1",
                "Building B, Floor 1",
                1L,
                "Main Auditorium - 2026-04-16 - 10:00-12:00",
                "LECTURE_HALL",
                createdAt,
                createdAt.plusHours(5));
        ticket.setOperationalImpact("Scheduled auditorium sessions are blocked until the projector signal path is restored.");
        ticket.setEvidenceNotes("projector-front.jpg, projector-shutdown-note.png");
        ticket.setAssignedTechnicianId(technician.publicId());
        ticket.setAssignedTechnicianName(technician.name());
        ticket.setAssignedByName(admin.name());
        ticket.setAssignedAt(createdAt.plusHours(1));
        ticket.setTechnicianStartedByName(technician.name());
        ticket.setTechnicianStartedAt(createdAt.plusHours(2));
        addEvidence(ticket, "projector-front.jpg", null);
        addEvidence(ticket, "projector-shutdown-note.png", null);
        addActivity(ticket, student.name(), student.role(), "TICKET_CREATED", "Reporter submitted the auditorium projector outage with booking context.", createdAt.plusMinutes(4));
        addActivity(ticket, admin.name(), admin.role(), "TECHNICIAN_ASSIGNED", "Admin dispatched " + technician.name() + " to the auditorium incident.", createdAt.plusHours(1));
        addActivity(ticket, technician.name(), technician.role(), "STATUS_UPDATED", "Technician started diagnostics and moved the case to In Progress.", createdAt.plusHours(2));
        addComment(ticket, student.publicId(), student.name(), student.role(), "The projector shut down twice during the opening presentation.", createdAt.plusMinutes(10));
        addComment(ticket, technician.publicId(), technician.name(), technician.role(), "Lamp temperature is high. Running power-cycle and cooling checks now.", createdAt.plusHours(2).plusMinutes(20));
        return ticket;
    }

    private Ticket buildResolvedTicket(RoleIdentity student, RoleIdentity technician, RoleIdentity admin, OffsetDateTime createdAt) {
        Ticket ticket = baseTicket(
                "Air conditioning failure in Collaborative Space 1",
                "The collaborative room air conditioning stopped cooling during a booked group session and the room became too warm for students to continue comfortably.",
                TicketCategory.FACILITY,
                TicketPriority.MEDIUM,
                TicketStatus.RESOLVED,
                student,
                "Collaborative Space 1",
                "Library, Level 2",
                "Library, Level 2 - Window side cluster",
                3L,
                "Collaborative Space 1 - 2026-04-17 - 14:00-16:00",
                "STUDY_SPACE",
                createdAt,
                createdAt.plusHours(8));
        ticket.setOperationalImpact("Booked student collaboration session was disrupted by the temperature spike in the room.");
        ticket.setEvidenceNotes("ac-display.jpg");
        ticket.setAssignedTechnicianId(technician.publicId());
        ticket.setAssignedTechnicianName(technician.name());
        ticket.setAssignedByName(admin.name());
        ticket.setAssignedAt(createdAt.plusHours(1));
        ticket.setTechnicianStartedByName(technician.name());
        ticket.setTechnicianStartedAt(createdAt.plusHours(2));
        ticket.setResolvedByName(technician.name());
        ticket.setResolvedAt(createdAt.plusHours(7));
        ticket.setResolutionNotes("Filter blockage cleared, thermostat recalibrated, and airflow verified after a 20-minute stability test.");
        addEvidence(ticket, "ac-display.jpg", null);
        addActivity(ticket, student.name(), student.role(), "TICKET_CREATED", "Reporter created the HVAC issue linked to the booked room.", createdAt.plusMinutes(5));
        addActivity(ticket, admin.name(), admin.role(), "TECHNICIAN_ASSIGNED", "Admin assigned the HVAC issue to " + technician.name() + ".", createdAt.plusHours(1));
        addActivity(ticket, technician.name(), technician.role(), "STATUS_UPDATED", "Technician began onsite work and inspected the clogged filter assembly.", createdAt.plusHours(2));
        addActivity(ticket, technician.name(), technician.role(), "STATUS_UPDATED", "Technician marked the issue as resolved after airflow returned to normal.", createdAt.plusHours(7));
        addComment(ticket, technician.publicId(), technician.name(), technician.role(), "Cooling is stable again. Waiting for reporter confirmation before closure.", createdAt.plusHours(7).plusMinutes(10));
        return ticket;
    }

    private Ticket buildClosedTicket(RoleIdentity student, RoleIdentity technician, RoleIdentity admin, OffsetDateTime createdAt) {
        Ticket ticket = baseTicket(
                "Podium microphone failure during seminar",
                "The podium microphone in Auditorium B cut out repeatedly during a seminar, making it hard for the audience to hear the presenter.",
                TicketCategory.EQUIPMENT,
                TicketPriority.MEDIUM,
                TicketStatus.CLOSED,
                student,
                "Auditorium B",
                "Building B, Floor 2",
                "Building B, Floor 2 - Podium audio rack",
                4L,
                "Auditorium B - 2026-04-14 - 09:00-11:00",
                "LECTURE_HALL",
                createdAt,
                createdAt.plusDays(1));
        ticket.setOperationalImpact("Seminar delivery quality dropped because the speaker audio kept cutting out mid-session.");
        ticket.setAssignedTechnicianId(technician.publicId());
        ticket.setAssignedTechnicianName(technician.name());
        ticket.setAssignedByName(admin.name());
        ticket.setAssignedAt(createdAt.plusHours(1));
        ticket.setTechnicianStartedByName(technician.name());
        ticket.setTechnicianStartedAt(createdAt.plusHours(2));
        ticket.setResolvedByName(technician.name());
        ticket.setResolvedAt(createdAt.plusHours(6));
        ticket.setClosedByName(student.name());
        ticket.setClosedAt(createdAt.plusHours(26));
        ticket.setResolutionNotes("Loose mixer input was secured and the microphone cable was replaced before the follow-up sound test.");
        addActivity(ticket, student.name(), student.role(), "TICKET_CREATED", "Reporter raised the podium microphone issue after the seminar disruption.", createdAt.plusMinutes(6));
        addActivity(ticket, admin.name(), admin.role(), "TECHNICIAN_ASSIGNED", "Admin routed the audio incident to " + technician.name() + ".", createdAt.plusHours(1));
        addActivity(ticket, technician.name(), technician.role(), "STATUS_UPDATED", "Technician completed the audio repair and marked the case resolved.", createdAt.plusHours(6));
        addActivity(ticket, student.name(), student.role(), "TICKET_CLOSED", "Reporter confirmed the podium audio was stable in the next session.", createdAt.plusHours(26));
        addComment(ticket, student.publicId(), student.name(), student.role(), "Confirmed in the follow-up seminar that the microphone is working clearly again.", createdAt.plusHours(26).plusMinutes(5));
        return ticket;
    }

    private Ticket buildRejectedTicket(RoleIdentity student, RoleIdentity admin, OffsetDateTime createdAt) {
        Ticket ticket = baseTicket(
                "Duplicate projector concern in Lab 2",
                "A second ticket was submitted for the same Lab 2 projector issue even though the maintenance team already has an active case for that exact equipment.",
                TicketCategory.EQUIPMENT,
                TicketPriority.LOW,
                TicketStatus.REJECTED,
                student,
                "Lab 2 Projector",
                "Engineering Building, Floor 1",
                "Engineering Building, Floor 1 - Lab 2 projector mount",
                null,
                null,
                "EQUIPMENT",
                createdAt,
                createdAt.plusHours(2));
        ticket.setOperationalImpact("This ticket duplicates an existing active case and would create admin noise if triaged separately.");
        ticket.setRejectionReason("Rejected as a duplicate because an active Lab 2 projector incident already exists in the operations queue.");
        ticket.setRejectedByName(admin.name());
        ticket.setRejectedAt(createdAt.plusHours(2));
        addActivity(ticket, student.name(), student.role(), "TICKET_CREATED", "Reporter created a second equipment issue record for the same projector.", createdAt.plusMinutes(4));
        addActivity(ticket, admin.name(), admin.role(), "STATUS_UPDATED", "Admin rejected the ticket after confirming it duplicated an already tracked incident.", createdAt.plusHours(2));
        addComment(ticket, admin.publicId(), admin.name(), admin.role(), "Please follow the existing ticket already open for this projector so updates stay in one place.", createdAt.plusHours(2).plusMinutes(6));
        return ticket;
    }

    private Ticket baseTicket(String title,
                              String description,
                              TicketCategory category,
                              TicketPriority priority,
                              TicketStatus status,
                              RoleIdentity student,
                              String resourceName,
                              String resourceLocation,
                              String incidentLocation,
                              Long relatedBookingId,
                              String relatedBookingLabel,
                              String resourceType,
                              OffsetDateTime createdAt,
                              OffsetDateTime updatedAt) {
        Ticket ticket = new Ticket();
        ticket.setTitle(title);
        ticket.setDescription(description);
        ticket.setCategory(category);
        ticket.setPriority(priority);
        ticket.setStatus(status);
        ticket.setReporterId(student.publicId());
        ticket.setReporterName(student.name());
        ticket.setReporterEmail(student.email());
        ticket.setReporterRole(student.role());
        ticket.setResourceName(resourceName);
        ticket.setResourceLocation(resourceLocation);
        ticket.setIncidentLocation(incidentLocation);
        ticket.setRelatedBookingId(relatedBookingId);
        ticket.setRelatedBookingLabel(relatedBookingLabel);
        ticket.setResourceType(resourceType);
        ticket.setPreferredContact(student.email());
        ticket.setCreatedAt(createdAt);
        ticket.setUpdatedAt(updatedAt);
        return ticket;
    }

    private void addEvidence(Ticket ticket, String label, String referenceUrl) {
        TicketEvidence evidence = new TicketEvidence();
        evidence.setTicket(ticket);
        evidence.setLabel(label);
        evidence.setReferenceUrl(referenceUrl);
        ticket.getEvidenceItems().add(evidence);
    }

    private void addActivity(Ticket ticket,
                             String actorName,
                             UserRole actorRole,
                             String action,
                             String detail,
                             OffsetDateTime createdAt) {
        TicketActivity activity = new TicketActivity();
        activity.setTicket(ticket);
        activity.setActorName(actorName);
        activity.setActorRole(actorRole);
        activity.setAction(action);
        activity.setDetail(detail);
        activity.setCreatedAt(createdAt);
        ticket.getActivities().add(activity);
    }

    private void addComment(Ticket ticket,
                            String authorId,
                            String authorName,
                            UserRole authorRole,
                            String body,
                            OffsetDateTime createdAt) {
        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthorId(authorId);
        comment.setAuthorName(authorName);
        comment.setAuthorRole(authorRole);
        comment.setBody(body);
        comment.setCreatedAt(createdAt);
        comment.setUpdatedAt(createdAt);
        comment.setEdited(false);
        comment.setDeleted(false);
        ticket.getComments().add(comment);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private List<Ticket> distinctTickets(List<Ticket> tickets) {
        Map<Long, Ticket> uniqueTickets = new LinkedHashMap<>();
        for (Ticket ticket : tickets) {
            uniqueTickets.putIfAbsent(ticket.getId(), ticket);
        }
        return List.copyOf(uniqueTickets.values());
    }

    private record RoleIdentity(String publicId, String name, String email, UserRole role) {
    }
}
