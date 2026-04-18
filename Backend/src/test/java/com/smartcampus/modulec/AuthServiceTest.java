package com.smartcampus.modulec;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.dto.ForgotPasswordRequest;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.repository.EmailVerificationTokenRepository;
import com.smartcampus.operationshub.auth.repository.PasswordResetTokenRepository;
import com.smartcampus.operationshub.auth.repository.TechnicianInviteRepository;
import com.smartcampus.operationshub.auth.service.AuthMailService;
import com.smartcampus.operationshub.auth.service.AuthService;
import com.smartcampus.operationshub.auth.service.AuthThrottleService;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootTest(properties = {
        "app.auth.bootstrap-admin.email=seed-admin@campus.edu",
        "app.auth.bootstrap-admin.password=Admin@123!"
})
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Autowired
    private TechnicianInviteRepository technicianInviteRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthThrottleService authThrottleService;

    @MockBean
    private AuthMailService authMailService;

    @BeforeEach
    void setUp() {
        authThrottleService.clearAll();
        technicianInviteRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        emailVerificationTokenRepository.deleteAll();
        authUserRepository.findAll().stream()
                .filter(user -> !"seed-admin@campus.edu".equalsIgnoreCase(user.getEmail()))
                .forEach(authUserRepository::delete);
    }

    @Test
    void googleLoginAllowsExistingGoogleStudentAccount() {
        AuthUser student = saveUser("student-100", "student@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.GOOGLE);
        student.setGoogleId("google-100");
        authUserRepository.save(student);

        AuthService.GoogleAuthenticationResult result = authService.handleGoogleLogin("google-100", "student@campus.edu", "Student One", true);

        assertTrue(!result.onboardingRequired());
        assertEquals(student.getPublicId(), result.user().getPublicId());
        assertEquals(AuthProviderType.GOOGLE, result.user().getAuthProviderType());
        assertEquals(UserRole.STUDENT, result.user().getRole());
    }

    @Test
    void googleLoginRejectsExistingLocalStudentAccount() {
        saveUser("student-200", "local-student@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.LOCAL);

        BadCredentialsException error = assertThrows(BadCredentialsException.class,
                () -> authService.handleGoogleLogin("google-local", "local-student@campus.edu", "Local Student", true));

        assertEquals("This account uses email and password. Please sign in with local login.", error.getMessage());
    }

    @Test
    void googleLoginRejectsTechnicianAccountEvenWhenEmailMatches() {
        saveUser("tech-300", "tech@campus.edu", UserRole.TECHNICIAN, AccountStatus.ACTIVE, AuthProviderType.LOCAL);

        BadCredentialsException error = assertThrows(BadCredentialsException.class,
                () -> authService.handleGoogleLogin("google-tech", "tech@campus.edu", "Technician User", true));

        assertEquals("This account uses email and password. Please sign in with local login.", error.getMessage());
    }

    @Test
    void googleLoginRejectsSeededAdminAccountEvenWhenEmailMatches() {
        BadCredentialsException error = assertThrows(BadCredentialsException.class,
                () -> authService.handleGoogleLogin("google-admin", "seed-admin@campus.edu", "Seed Admin", true));

        assertEquals("This account uses email and password. Please sign in with local login.", error.getMessage());
    }

    @Test
    void googleLoginRequiresOnboardingForBrandNewStudent() {
        long beforeCount = authUserRepository.count();

        AuthService.GoogleAuthenticationResult result = authService.handleGoogleLogin("google-new", "new-student@campus.edu", "New Student", true);

        assertTrue(result.onboardingRequired());
        assertNotNull(result.onboardingState());
        assertEquals("new-student@campus.edu", result.onboardingState().email());
        assertEquals(beforeCount, authUserRepository.count());
    }

    @Test
    void googleLoginRejectsDisabledAccounts() {
        AuthUser student = saveUser("student-400", "disabled@campus.edu", UserRole.STUDENT, AccountStatus.DISABLED, AuthProviderType.GOOGLE);
        student.setGoogleId("google-disabled");
        authUserRepository.save(student);

        assertThrows(BadCredentialsException.class,
                () -> authService.handleGoogleLogin("google-disabled", "disabled@campus.edu", "Disabled User", true));
    }

    @Test
    void googleLoginRejectsWhenExistingLinkedGoogleEmailDiffers() {
        AuthUser student = saveUser("student-500", "original@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.GOOGLE);
        student.setGoogleId("google-linked");
        authUserRepository.save(student);

        assertThrows(BadCredentialsException.class,
                () -> authService.handleGoogleLogin("google-linked", "different@campus.edu", "Different Person", true));
    }

    @Test
    void forgotPasswordSkipsGoogleOnlyAccounts() {
        AuthUser student = saveUser("student-600", "google-only@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.GOOGLE);
        student.setGoogleId("google-reset");
        authUserRepository.save(student);

        authService.requestPasswordReset(new ForgotPasswordRequest("google-only@campus.edu"), "127.0.0.1");

        assertEquals(0, passwordResetTokenRepository.count());
        verify(authMailService, never()).sendPasswordResetEmail(any(), any());
    }

    private AuthUser saveUser(String publicId, String email, UserRole role, AccountStatus status, AuthProviderType providerType) {
        AuthUser user = new AuthUser();
        user.setPublicId(publicId);
        user.setFullName("Test User");
        user.setEmail(email);
        if (providerType != AuthProviderType.GOOGLE) {
            user.setPasswordHash(passwordEncoder.encode("Password@123"));
        }
        user.setRole(role);
        user.setStatus(status);
        user.setAuthProviderType(providerType);
        user.setEmailVerified(status != AccountStatus.PENDING_VERIFICATION);
        user.setCreatedAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());
        return authUserRepository.save(user);
    }
}
