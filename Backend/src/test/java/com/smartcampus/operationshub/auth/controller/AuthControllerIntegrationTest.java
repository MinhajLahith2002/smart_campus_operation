package com.smartcampus.operationshub.auth.controller;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartcampus.modulec.ModuleCBackendApplication;
import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.PasswordResetToken;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.repository.EmailVerificationTokenRepository;
import com.smartcampus.operationshub.auth.repository.PasswordResetTokenRepository;
import com.smartcampus.operationshub.auth.repository.TechnicianInviteRepository;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import com.smartcampus.operationshub.auth.service.AuthMailService;
import com.smartcampus.operationshub.auth.service.AuthService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = ModuleCBackendApplication.class, properties = {
        "app.auth.bootstrap-admin.email=admin@campus.edu",
        "app.auth.bootstrap-admin.password=Admin@123!"
})
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private TechnicianInviteRepository technicianInviteRepository;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private AuthMailService authMailService;

    @BeforeEach
    void setUp() {
        technicianInviteRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        emailVerificationTokenRepository.deleteAll();
        authUserRepository.findAll().stream()
                .filter(user -> !"admin@campus.edu".equalsIgnoreCase(user.getEmail()))
                .forEach(authUserRepository::delete);
        doNothing().when(authMailService).sendVerificationEmail(any(), any());
        doNothing().when(authMailService).sendPasswordResetEmail(any(), any());
        doNothing().when(authMailService).sendTechnicianInviteEmail(any(), any());
    }

    @Test
    void localEmailLoginSucceedsAndAllowsProtectedAccess() throws Exception {
        AuthUser student = saveUser("student-1", "student-login@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.LOCAL);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student-login@campus.edu","password":"Password@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email", is("student-login@campus.edu")))
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/module-c/tickets")
                        .session(session)
                        .param("requesterRole", "STUDENT")
                        .param("requesterId", student.getPublicId()))
                .andExpect(status().isOk());
    }

    @Test
    void studentCompleteLocalRegistrationVerificationResetAndLoginFlowWorks() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"  Student Flow  ",
                                  "email":"StudentFlow@Campus.edu",
                                  "password":"Password@123",
                                  "confirmPassword":"Password@123",
                                  "studentId":" it20240002 ",
                                  "faculty":" information technology ",
                                  "batch":"2024",
                                  "campus":" Malabe ",
                                  "phone":"+94 712345678",
                                  "acceptedTerms":true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email", is("studentflow@campus.edu")))
                .andExpect(jsonPath("$.user.role", is("STUDENT")))
                .andExpect(jsonPath("$.user.status", is("PENDING_VERIFICATION")))
                .andExpect(jsonPath("$.user.authProviderType", is("LOCAL")))
                .andExpect(jsonPath("$.user.emailVerified", is(false)));

        ArgumentCaptor<String> verificationLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(authMailService).sendVerificationEmail(any(), verificationLinkCaptor.capture());
        String verificationToken = extractToken(verificationLinkCaptor.getValue());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"studentflow@campus.edu","password":"Password@123"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Please verify your email before signing in.")));

        mockMvc.perform(get("/api/auth/verify-email")
                        .param("token", verificationToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Your email address has been verified.")));

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"studentflow@campus.edu","password":"Password@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.status", is("ACTIVE")))
                .andExpect(jsonPath("$.user.authProviderType", is("LOCAL")))
                .andReturn();

        MockHttpSession studentSession = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/me")
                        .session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role", is("STUDENT")));

        mockMvc.perform(post("/api/auth/logout")
                        .session(studentSession))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me")
                        .session(studentSession))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"studentflow@campus.edu"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("If an account exists for that email, a password reset link has been sent.")));

        ArgumentCaptor<String> resetLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(authMailService).sendPasswordResetEmail(any(), resetLinkCaptor.capture());
        String resetToken = extractToken(resetLinkCaptor.getValue());

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token":"%s",
                                  "password":"Updated@123",
                                  "confirmPassword":"Updated@123"
                                }
                                """.formatted(resetToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Your password has been updated.")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"studentflow@campus.edu","password":"Password@123"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Invalid email or password.")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"studentflow@campus.edu","password":"Updated@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role", is("STUDENT")))
                .andExpect(jsonPath("$.user.authProviderType", is("LOCAL")));
    }

    @Test
    void studentGoogleOnboardingCreatesGoogleOnlyAccountAndBlocksLocalPasswordFlows() throws Exception {
        MockHttpSession googleSession = new MockHttpSession();
        googleSession.setAttribute(AuthService.GOOGLE_ONBOARDING_SESSION_KEY,
                new AuthService.GoogleOnboardingState("google-200", "google.student@campus.edu", "Google Student", OffsetDateTime.now()));

        mockMvc.perform(get("/api/auth/google/onboarding")
                        .session(googleSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("google.student@campus.edu")))
                .andExpect(jsonPath("$.fullName", is("Google Student")));

        MvcResult onboardingResult = mockMvc.perform(post("/api/auth/google/onboarding")
                        .session(googleSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Google Student",
                                  "studentId":"IT20240003",
                                  "faculty":"IT",
                                  "batch":"2024",
                                  "campus":"malabe",
                                  "phone":"+94 712345679",
                                  "acceptedTerms":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email", is("google.student@campus.edu")))
                .andExpect(jsonPath("$.user.role", is("STUDENT")))
                .andExpect(jsonPath("$.user.authProviderType", is("GOOGLE")))
                .andReturn();

        MockHttpSession authenticatedSession = (MockHttpSession) onboardingResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/me")
                        .session(authenticatedSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.authProviderType", is("GOOGLE")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"google.student@campus.edu","password":"Password@123"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("This account uses Google sign-in. Please continue with Google.")));

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"google.student@campus.edu"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("If an account exists for that email, a password reset link has been sent.")));

        verify(authMailService, never()).sendPasswordResetEmail(any(), any());
    }

    @Test
    void loginValidationErrorsAreReturned() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"","password":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void duplicateStudentIdIsRejectedWithFieldError() throws Exception {
        AuthUser existing = saveUser("student-2", "existing@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.LOCAL);
        existing.setStudentId("IT20240001");
        authUserRepository.save(existing);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"New Student",
                                  "email":"new@campus.edu",
                                  "password":"Password@123",
                                  "confirmPassword":"Password@123",
                                  "studentId":"IT20240001",
                                  "faculty":"IT",
                                  "batch":"2024",
                                  "campus":"malabe",
                                  "phone":"+94 712345678",
                                  "acceptedTerms":true
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.details.fields.studentId", is("a student ID can register using one email only")));
    }

    @Test
    void forgotPasswordAvoidsAccountEnumeration() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"unknown@campus.edu"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("If an account exists for that email, a password reset link has been sent.")));
    }

    @Test
    void resetPasswordAcceptsValidTokenAndMarksItUsed() throws Exception {
        AuthUser student = saveUser("student-3", "reset@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.LOCAL);
        String rawToken = "reset-token-123";
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(student);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(OffsetDateTime.now().plusHours(2));
        passwordResetTokenRepository.save(token);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token":"reset-token-123",
                                  "password":"NewPassword@123",
                                  "confirmPassword":"NewPassword@123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Your password has been updated.")));

        PasswordResetToken updated = passwordResetTokenRepository.findById(token.getId()).orElseThrow();
        AuthUser updatedUser = authUserRepository.findByEmail("reset@campus.edu").orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotNull(updated.getUsedAt());
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches("NewPassword@123", updatedUser.getPasswordHash()));
    }

    @Test
    void technicianCompleteInviteSetupAndLoginFlowWorks() throws Exception {
        MockHttpSession adminSession = loginAndGetSession("admin@campus.edu", "Admin@123!");

        mockMvc.perform(post("/api/auth/admin/invites")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Campus Technician",
                                  "email":"technician.flow@campus.edu"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("technician.flow@campus.edu")))
                .andExpect(jsonPath("$.status", is("PENDING")));

        mockMvc.perform(get("/api/auth/admin/invites")
                        .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='technician.flow@campus.edu' && @.status=='PENDING')]").exists());

        ArgumentCaptor<String> inviteLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(authMailService).sendTechnicianInviteEmail(any(), inviteLinkCaptor.capture());
        String rawToken = extractToken(inviteLinkCaptor.getValue());

        mockMvc.perform(get("/api/auth/invitations/{token}", rawToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("technician.flow@campus.edu")))
                .andExpect(jsonPath("$.status", is("PENDING")));

        MvcResult acceptanceResult = mockMvc.perform(post("/api/auth/invitations/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token":"%s",
                                  "password":"Technician@123",
                                  "confirmPassword":"Technician@123"
                                }
                                """.formatted(rawToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role", is("TECHNICIAN")))
                .andExpect(jsonPath("$.user.status", is("ACTIVE")))
                .andExpect(jsonPath("$.user.authProviderType", is("LOCAL")))
                .andReturn();

        MockHttpSession technicianSession = (MockHttpSession) acceptanceResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/me")
                        .session(technicianSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email", is("technician.flow@campus.edu")))
                .andExpect(jsonPath("$.user.role", is("TECHNICIAN")));

        mockMvc.perform(post("/api/auth/logout")
                        .session(technicianSession))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"technician.flow@campus.edu","password":"Technician@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role", is("TECHNICIAN")));
    }

    @Test
    void seededAdminCompleteLoginAndUserManagementFlowWorks() throws Exception {
        AuthUser student = saveUser("student-5", "managed@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.LOCAL);

        MockHttpSession adminSession = loginAndGetSession("admin@campus.edu", "Admin@123!");

        mockMvc.perform(get("/api/auth/me")
                        .session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email", is("admin@campus.edu")))
                .andExpect(jsonPath("$.user.role", is("ADMIN")))
                .andExpect(jsonPath("$.user.authProviderType", is("LOCAL")));

        mockMvc.perform(get("/api/auth/admin/users")
                        .session(adminSession)
                        .param("query", "managed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='managed@campus.edu' && @.role=='STUDENT' && @.status=='ACTIVE')]").exists());

        mockMvc.perform(patch("/api/auth/admin/users/{userId}/status", student.getPublicId())
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"DISABLED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DISABLED")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"managed@campus.edu","password":"Password@123"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("This account is currently disabled.")));
    }

    @Test
    void adminCanListUsersAndDisableAccount() throws Exception {
        AuthUser admin = authUserRepository.findByEmail("admin@campus.edu").orElseThrow();
        AuthUser student = saveUser("student-4", "visibility@campus.edu", UserRole.STUDENT, AccountStatus.ACTIVE, AuthProviderType.LOCAL);
        UsernamePasswordAuthenticationToken adminAuth = new UsernamePasswordAuthenticationToken(
                new AuthUserPrincipal(admin),
                null,
                new AuthUserPrincipal(admin).getAuthorities()
        );

        mockMvc.perform(get("/api/auth/admin/users")
                        .with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='visibility@campus.edu')]").exists());

        mockMvc.perform(patch("/api/auth/admin/users/{userId}/status", student.getPublicId())
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"DISABLED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DISABLED")));
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
        return authUserRepository.save(user);
    }

    private MockHttpSession loginAndGetSession(String email, String password) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) loginResult.getRequest().getSession(false);
    }

    private String hash(String rawToken) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
    }

    private String extractToken(String link) {
        return link.substring(link.indexOf("token=") + 6);
    }
}
