package com.smartcampus.operationshub.config;

import com.smartcampus.modulec.ModuleCBackendApplication;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootTest(classes = ModuleCBackendApplication.class)
class AuthSampleUserSyncIntegrationTest {

    @Autowired
    private AuthProperties authProperties;

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void syncConfiguredSampleAccountsIntoLiveDatabase() throws Exception {
        AuthBootstrapConfig config = new AuthBootstrapConfig();
        var runner = config.bootstrapAdmin(authProperties, authUserRepository, passwordEncoder);
        runner.run();

        var admin = authUserRepository.findByEmail(authProperties.getBootstrapAdmin().getEmail().trim().toLowerCase()).orElseThrow();
        assertEquals(UserRole.ADMIN, admin.getRole());
        assertEquals(AccountStatus.ACTIVE, admin.getStatus());
        assertTrue(passwordEncoder.matches(authProperties.getBootstrapAdmin().getPassword(), admin.getPasswordHash()));

        var studentProps = authProperties.getSampleUsers().getStudent();
        var student = authUserRepository.findByEmail(studentProps.getEmail().trim().toLowerCase()).orElseThrow();
        assertEquals(UserRole.STUDENT, student.getRole());
        assertEquals(AccountStatus.ACTIVE, student.getStatus());
        assertTrue(passwordEncoder.matches(studentProps.getPassword(), student.getPasswordHash()));

        var technicianProps = authProperties.getSampleUsers().getTechnician();
        var technician = authUserRepository.findByEmail(technicianProps.getEmail().trim().toLowerCase()).orElseThrow();
        assertEquals(UserRole.TECHNICIAN, technician.getRole());
        assertEquals(AccountStatus.ACTIVE, technician.getStatus());
        assertTrue(passwordEncoder.matches(technicianProps.getPassword(), technician.getPasswordHash()));
    }
}
