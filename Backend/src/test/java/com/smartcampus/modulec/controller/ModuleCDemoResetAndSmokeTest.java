package com.smartcampus.modulec.controller;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartcampus.modulec.ModuleCBackendApplication;
import com.smartcampus.modulec.domain.Ticket;
import com.smartcampus.modulec.repository.TicketRepository;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = ModuleCBackendApplication.class, properties = {
        "app.auth.bootstrap-admin.email=admin@campus.edu",
        "app.auth.bootstrap-admin.password=Admin@123!"
})
@AutoConfigureMockMvc
@EnabledIfSystemProperty(named = "modulec.reset", matches = "true")
class ModuleCDemoResetAndSmokeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    @Qualifier("seedModuleData")
    private CommandLineRunner seedModuleData;

    @Autowired
    @Qualifier("alignSeedIdentityReferences")
    private CommandLineRunner alignSeedIdentityReferences;

    @Autowired
    private EntityManager entityManager;

    @Test
    void resetsModuleCDataAndVerifiesDemoPortfolio() throws Exception {
        try {
            resetModuleCData();

            AuthUser admin = findUser("admin@campus.edu");
            AuthUser student = findUser("student@campus.edu");
            AuthUser technician = findUser("technician@campus.edu");

            Ticket detailTicket = findTicket("Projector outage in Main Auditorium");
            Ticket openTicket = findTicket("Water leak reported near Library study zone");
            Ticket resolvedTicket = findTicket("Air conditioning failure in Collaborative Space 1");

            mockMvc.perform(get("/api/module-c/tickets")
                            .with(authentication(authFor(admin)))
                            .param("requesterRole", "ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(9)))
                    .andExpect(jsonPath("$[0].activities", hasSize(0)))
                    .andExpect(jsonPath("$[0].comments", hasSize(0)));

            mockMvc.perform(get("/api/module-c/tickets/summary")
                            .with(authentication(authFor(admin))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total", is(9)))
                    .andExpect(jsonPath("$.open", is(2)))
                    .andExpect(jsonPath("$.triaged", is(1)))
                    .andExpect(jsonPath("$.assigned", is(1)))
                    .andExpect(jsonPath("$.inProgress", is(2)))
                    .andExpect(jsonPath("$.resolved", is(2)))
                    .andExpect(jsonPath("$.unassigned", is(4)))
                    .andExpect(jsonPath("$.highOrCritical", is(5)));

            mockMvc.perform(get("/api/module-c/tickets")
                            .with(authentication(authFor(student)))
                            .param("requesterRole", "STUDENT")
                            .param("requesterId", student.getPublicId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()", greaterThan(0)));

            mockMvc.perform(get("/api/module-c/tickets")
                            .with(authentication(authFor(technician)))
                            .param("requesterRole", "TECHNICIAN")
                            .param("requesterId", technician.getPublicId())
                            .param("assignedToMe", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()", greaterThan(0)));

            mockMvc.perform(get("/api/module-c/tickets/{ticketId}", detailTicket.getId())
                            .with(authentication(authFor(student))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title", is("Projector outage in Main Auditorium")))
                    .andExpect(jsonPath("$.activities.length()", greaterThan(0)))
                    .andExpect(jsonPath("$.comments.length()", greaterThan(0)));

            mockMvc.perform(patch("/api/module-c/tickets/{ticketId}/assign", openTicket.getId())
                            .with(authentication(authFor(admin)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "technicianId":"tech-17",
                                      "technicianName":"Sample Technician",
                                      "actorId":"admin-bootstrap",
                                      "actorName":"Campus Operations Admin",
                                      "actorRole":"ADMIN"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("ASSIGNED")))
                    .andExpect(jsonPath("$.assignedTechnicianId", is("tech-17")));

            mockMvc.perform(patch("/api/module-c/tickets/{ticketId}/status", detailTicket.getId())
                            .with(authentication(authFor(technician)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "status":"RESOLVED",
                                      "resolutionNotes":"Technician replaced the failing component and verified stable operation.",
                                      "actorId":"tech-17",
                                      "actorName":"Sample Technician",
                                      "actorRole":"TECHNICIAN",
                                      "detail":"Technician marked the issue resolved after successful repair verification."
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("RESOLVED")))
                    .andExpect(jsonPath("$.resolvedByName", is("Sample Technician")));

            detailTicket = ticketRepository.findById(detailTicket.getId())
                    .orElseThrow(() -> new IllegalStateException("Expected resolved detail ticket was not found."));
            detailTicket.setReporterId("legacy-student-id");
            ticketRepository.save(detailTicket);

            mockMvc.perform(patch("/api/module-c/tickets/{ticketId}/close", detailTicket.getId())
                            .with(authentication(authFor(student)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "actorId":"student-01",
                                      "actorName":"Sample Student",
                                      "actorRole":"STUDENT",
                                      "note":"Reporter confirmed the repair is complete."
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("CLOSED")))
                    .andExpect(jsonPath("$.closedByName", is("Sample Student")));

            mockMvc.perform(patch("/api/module-c/tickets/{ticketId}/reopen", resolvedTicket.getId())
                            .with(authentication(authFor(student)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "actorId":"student-01",
                                      "actorName":"Sample Student",
                                      "actorRole":"STUDENT",
                                      "note":"Cooling dropped again after the technician left.",
                                      "evidenceLabel":"ac-still-warm.png",
                                      "evidenceDataUrl":"data:image/png;base64,aGVsbG8="
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("OPEN")))
                    .andExpect(jsonPath("$.evidenceLabels", hasItem("ac-still-warm.png")));
        } finally {
            resetModuleCData();
        }
    }

    private void resetModuleCData() throws Exception {
        jdbcTemplate.execute("truncate table ticket_comments, ticket_activities, ticket_evidence, tickets restart identity cascade");
        entityManager.clear();
        org.junit.jupiter.api.Assertions.assertEquals(0, ticketRepository.count(), "Module C tickets should be cleared before reseeding.");
        seedModuleData.run();
        entityManager.clear();
        alignSeedIdentityReferences.run();
        entityManager.clear();
        org.junit.jupiter.api.Assertions.assertEquals(9, ticketRepository.count(), "Module C demo portfolio should contain 9 tickets after reseeding.");
    }

    private Ticket findTicket(String title) {
        return ticketRepository.findAll().stream()
                .filter(ticket -> title.equals(ticket.getTitle()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Expected seeded Module C ticket was not found: " + title));
    }

    private AuthUser findUser(String email) {
        Optional<AuthUser> user = authUserRepository.findByEmail(email);
        return user.orElseThrow(() -> new IllegalStateException("Expected demo user not found for email: " + email));
    }

    private UsernamePasswordAuthenticationToken authFor(AuthUser user) {
        AuthUserPrincipal principal = new AuthUserPrincipal(user);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }
}
