package com.smartcampus.modulec.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.domain.TicketCategory;
import com.smartcampus.modulec.domain.TicketPriority;
import com.smartcampus.modulec.domain.TicketStatus;
import com.smartcampus.modulec.repository.TicketRepository;
import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.repository.EmailVerificationTokenRepository;
import com.smartcampus.operationshub.auth.repository.PasswordResetTokenRepository;
import com.smartcampus.operationshub.auth.repository.TechnicianInviteRepository;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import com.smartcampus.operationshub.auth.service.AuthMailService;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "app.auth.bootstrap-admin.email=admin@campus.edu",
        "app.auth.bootstrap-admin.password=Admin@123!"
})
@AutoConfigureMockMvc
class TicketDuplicateCheckIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private TechnicianInviteRepository technicianInviteRepository;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @MockBean
    private AuthMailService authMailService;

    private AuthUser student;

    @BeforeEach
    void setUp() {
        ticketRepository.deleteAll();
        technicianInviteRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        emailVerificationTokenRepository.deleteAll();
        authUserRepository.findAll().stream()
                .filter(user -> !"admin@campus.edu".equalsIgnoreCase(user.getEmail()))
                .forEach(authUserRepository::delete);
        student = saveUser("student-duplicate", "student.duplicate@campus.edu", "Duplicate Student", UserRole.STUDENT);
    }

    @Test
    void duplicateCheckFindsSimilarActiveRecentTicket() throws Exception {
        AuthUser reporter = saveUser("student-other", "other.reporter@campus.edu", "Other Reporter", UserRole.STUDENT);
        Ticket duplicate = saveTicket(reporter, TicketStatus.IN_PROGRESS, OffsetDateTime.now().minusHours(2));

        mockMvc.perform(post("/api/module-c/tickets/duplicate-check")
                        .with(authentication(authFor(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resourceName":"Lab 4 Projector",
                                  "resourceLocation":"Engineering Building, Floor 4",
                                  "incidentLocation":"Engineering Building, Floor 4",
                                  "category":"EQUIPMENT",
                                  "title":"Lab 4 projector overheats",
                                  "description":"The projector overheats, shuts down after a few minutes, and interrupts the class session.",
                                  "operationalImpact":"Lecture delivery is interrupted."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ticketId", is(duplicate.getId().intValue())))
                .andExpect(jsonPath("$[0].status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$[0].matchReasons", hasItem("Same resource")))
                .andExpect(jsonPath("$[0].viewable", is(false)));
    }

    @Test
    void duplicateCheckIgnoresClosedAndOldTickets() throws Exception {
        AuthUser reporter = saveUser("student-old", "old.reporter@campus.edu", "Old Reporter", UserRole.STUDENT);
        saveTicket(reporter, TicketStatus.CLOSED, OffsetDateTime.now().minusHours(3));
        saveTicket(reporter, TicketStatus.OPEN, OffsetDateTime.now().minusDays(20));

        mockMvc.perform(post("/api/module-c/tickets/duplicate-check")
                        .with(authentication(authFor(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resourceName":"Lab 4 Projector",
                                  "resourceLocation":"Engineering Building, Floor 4",
                                  "incidentLocation":"Engineering Building, Floor 4",
                                  "category":"EQUIPMENT",
                                  "title":"Lab 4 projector overheats",
                                  "description":"The projector overheats, shuts down after a few minutes, and interrupts the class session.",
                                  "operationalImpact":"Lecture delivery is interrupted."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(0)));
    }

    private UsernamePasswordAuthenticationToken authFor(AuthUser user) {
        AuthUserPrincipal principal = new AuthUserPrincipal(user);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    private AuthUser saveUser(String publicId, String email, String fullName, UserRole role) {
        AuthUser user = new AuthUser();
        user.setPublicId(publicId);
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPasswordHash("test-password-hash");
        user.setRole(role);
        user.setStatus(AccountStatus.ACTIVE);
        user.setAuthProviderType(AuthProviderType.LOCAL);
        user.setEmailVerified(true);
        return authUserRepository.save(user);
    }

    private Ticket saveTicket(AuthUser reporter, TicketStatus status, OffsetDateTime updatedAt) {
        Ticket ticket = new Ticket();
        ticket.setTitle("Projector overheating in Lab 4");
        ticket.setDescription("The projector overheats, shuts down after a few minutes, and blocks the lecture flow.");
        ticket.setCategory(TicketCategory.EQUIPMENT);
        ticket.setPriority(TicketPriority.HIGH);
        ticket.setStatus(status);
        ticket.setReporterId(reporter.getPublicId());
        ticket.setReporterName(reporter.getFullName());
        ticket.setReporterEmail(reporter.getEmail());
        ticket.setReporterRole(reporter.getRole());
        ticket.setResourceName("Lab 4 Projector");
        ticket.setResourceLocation("Engineering Building, Floor 4");
        ticket.setIncidentLocation("Engineering Building, Floor 4");
        ticket.setPreferredContact(reporter.getEmail());
        ticket.setOperationalImpact("Lecture delivery is interrupted.");
        ticket.setCreatedAt(updatedAt.minusHours(1));
        ticket.setUpdatedAt(updatedAt);
        return ticketRepository.save(ticket);
    }
}
