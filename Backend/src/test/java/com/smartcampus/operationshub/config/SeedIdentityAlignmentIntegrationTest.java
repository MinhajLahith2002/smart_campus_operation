package com.smartcampus.operationshub.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartcampus.modulec.ModuleCBackendApplication;
import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.repository.TicketRepository;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.bookings.domain.BookingRecord;
import com.smartcampus.operationshub.bookings.repository.BookingRecordRepository;
import com.smartcampus.operationshub.notifications.domain.NotificationEvent;
import com.smartcampus.operationshub.notifications.repository.NotificationEventRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(classes = ModuleCBackendApplication.class)
@Transactional
class SeedIdentityAlignmentIntegrationTest {

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private BookingRecordRepository bookingRecordRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private NotificationEventRepository notificationEventRepository;

    @Test
    void alignsSeededIdsAcrossNeonBackedData() {
        assertThat(authUserRepository.findByEmail("student@campus.edu")).get().extracting("publicId").isEqualTo("student-01");
        assertThat(authUserRepository.findByEmail("technician@campus.edu")).get().extracting("publicId").isEqualTo("tech-17");

        List<BookingRecord> studentBookings = bookingRecordRepository.findAll().stream()
                .filter(booking -> "student@campus.edu".equalsIgnoreCase(booking.getRequesterEmail()))
                .toList();
        assertThat(studentBookings).isNotEmpty();
        assertThat(studentBookings).extracting(BookingRecord::getRequesterId).containsOnly("student-01");

        List<Ticket> studentTickets = ticketRepository.findAll().stream()
                .filter(ticket -> "student-01".equals(ticket.getReporterId()))
                .toList();
        assertThat(studentTickets).isNotEmpty();
        assertThat(studentTickets).extracting(Ticket::getTitle).contains(
                "Water leak reported near Library study zone",
                "Network dropouts in Advanced Robotics Lab",
                "Projector outage in Main Auditorium",
                "Air conditioning failure in Collaborative Space 1",
                "Podium microphone failure during seminar",
                "Duplicate projector concern in Lab 2"
        );
        assertThat(studentTickets).extracting(Ticket::getStatus).contains(
                TicketStatus.OPEN,
                TicketStatus.ASSIGNED,
                TicketStatus.IN_PROGRESS,
                TicketStatus.RESOLVED,
                TicketStatus.CLOSED,
                TicketStatus.REJECTED
        );
        assertThat(studentTickets.stream().filter(ticket -> !ticket.getEvidenceItems().isEmpty())).isNotEmpty();
        assertThat(studentTickets.stream().filter(ticket -> !ticket.getActivities().isEmpty())).isNotEmpty();
        assertThat(studentTickets.stream().filter(ticket -> !ticket.getComments().isEmpty())).isNotEmpty();

        List<Ticket> technicianTickets = ticketRepository.findAll().stream()
                .filter(ticket -> "tech-17".equals(ticket.getAssignedTechnicianId()))
                .toList();
        assertThat(technicianTickets).isNotEmpty();
        assertThat(technicianTickets).extracting(Ticket::getStatus).contains(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED);

        List<NotificationEvent> notifications = notificationEventRepository.findAll().stream()
                .filter(notification -> notification.getUserId() != null)
                .toList();
        assertThat(notifications).extracting(NotificationEvent::getUserId).doesNotContain("sample-student", "sample-technician");
    }
}
