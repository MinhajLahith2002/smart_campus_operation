package com.smartcampus.operationshub.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.smartcampus.modulec.ModuleCBackendApplication;
import com.smartcampus.operationshub.config.AuthBootstrapConfig;
import com.smartcampus.operationshub.config.AuthProperties;
import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.repository.EmailVerificationTokenRepository;
import com.smartcampus.operationshub.auth.repository.PasswordResetTokenRepository;
import com.smartcampus.operationshub.auth.repository.TechnicianInviteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootTest(classes = ModuleCBackendApplication.class)
class AuthBootstrapConfigTest {

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TechnicianInviteRepository technicianInviteRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @BeforeEach
    void setUp() {
        technicianInviteRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        emailVerificationTokenRepository.deleteAll();
        authUserRepository.deleteAll();
    }

    @Test
    void bootstrapAdminIsIdempotentAndPreservesAdminRole() throws Exception {
        AuthProperties properties = new AuthProperties();
        properties.getBootstrapAdmin().setEmail("bootstrap@campus.edu");
        properties.getBootstrapAdmin().setPassword("Admin@123!");
        properties.getBootstrapAdmin().setFullName("Bootstrap Admin");

        AuthBootstrapConfig config = new AuthBootstrapConfig();
        var runner = config.bootstrapAdmin(properties, authUserRepository, passwordEncoder);
        runner.run();
        runner.run();

        assertEquals(1, authUserRepository.findAll().size());
        var admin = authUserRepository.findByEmail("bootstrap@campus.edu").orElseThrow();
        assertEquals(UserRole.ADMIN, admin.getRole());
        assertEquals(AuthProviderType.LOCAL, admin.getAuthProviderType());
        assertNull(admin.getGoogleId());
        assertTrue(passwordEncoder.matches("Admin@123!", admin.getPasswordHash()));
    }

    @Test
    void sampleStudentAndTechnicianSeedsAreCreatedAsActiveLocalAccounts() throws Exception {
        AuthProperties properties = new AuthProperties();
        properties.getBootstrapAdmin().setEmail("bootstrap@campus.edu");
        properties.getBootstrapAdmin().setPassword("Admin@123!");
        properties.getSampleUsers().setEnabled(true);
        properties.getSampleUsers().getStudent().setEmail("student@campus.edu");
        properties.getSampleUsers().getStudent().setPassword("Student@123");
        properties.getSampleUsers().getStudent().setFullName("Sample Student");
        properties.getSampleUsers().getStudent().setStudentId("IT20240001");
        properties.getSampleUsers().getStudent().setFaculty("IT");
        properties.getSampleUsers().getStudent().setBatch("2024");
        properties.getSampleUsers().getStudent().setCampus("malabe");
        properties.getSampleUsers().getStudent().setPhone("+94 712345678");
        properties.getSampleUsers().getTechnician().setEmail("technician@campus.edu");
        properties.getSampleUsers().getTechnician().setPassword("Technician@123");
        properties.getSampleUsers().getTechnician().setFullName("Sample Technician");

        AuthBootstrapConfig config = new AuthBootstrapConfig();
        var runner = config.bootstrapAdmin(properties, authUserRepository, passwordEncoder);
        runner.run();
        runner.run();

        assertEquals(3, authUserRepository.findAll().size());

        var student = authUserRepository.findByEmail("student@campus.edu").orElseThrow();
        assertEquals(UserRole.STUDENT, student.getRole());
        assertEquals(AccountStatus.ACTIVE, student.getStatus());
        assertEquals(AuthProviderType.LOCAL, student.getAuthProviderType());
        assertEquals("IT20240001", student.getStudentId());
        assertEquals("IT", student.getFaculty());
        assertTrue(passwordEncoder.matches("Student@123", student.getPasswordHash()));

        var technician = authUserRepository.findByEmail("technician@campus.edu").orElseThrow();
        assertEquals(UserRole.TECHNICIAN, technician.getRole());
        assertEquals(AccountStatus.ACTIVE, technician.getStatus());
        assertEquals(AuthProviderType.LOCAL, technician.getAuthProviderType());
        assertNull(technician.getGoogleId());
        assertNull(technician.getStudentId());
        assertTrue(passwordEncoder.matches("Technician@123", technician.getPasswordHash()));
    }
}
