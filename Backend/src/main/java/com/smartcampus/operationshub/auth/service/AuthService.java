package com.smartcampus.operationshub.auth.service;

import com.smartcampus.operationshub.config.AuthProperties;
import com.smartcampus.operationshub.config.AuthBootstrapSupport;
import com.smartcampus.operationshub.common.ApiValidationException;
import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.EmailVerificationToken;
import com.smartcampus.operationshub.auth.domain.PasswordResetToken;
import com.smartcampus.operationshub.auth.domain.TechnicianInvite;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.dto.AuthResponse;
import com.smartcampus.operationshub.auth.dto.AuthUserResponse;
import com.smartcampus.operationshub.auth.dto.ForgotPasswordRequest;
import com.smartcampus.operationshub.auth.dto.GoogleOnboardingRequest;
import com.smartcampus.operationshub.auth.dto.GoogleOnboardingResponse;
import com.smartcampus.operationshub.auth.dto.InviteAcceptanceRequest;
import com.smartcampus.operationshub.auth.dto.InviteDetailsResponse;
import com.smartcampus.operationshub.auth.dto.LoginRequest;
import com.smartcampus.operationshub.auth.dto.RegisterRequest;
import com.smartcampus.operationshub.auth.dto.ResetPasswordRequest;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.repository.EmailVerificationTokenRepository;
import com.smartcampus.operationshub.auth.repository.PasswordResetTokenRepository;
import com.smartcampus.operationshub.auth.repository.TechnicianInviteRepository;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class AuthService {

    public static final String GOOGLE_ONBOARDING_SESSION_KEY = "googleOnboarding";

    private static final Set<String> ALLOWED_CAMPUSES = Set.of("malabe", "metro", "kandy", "matara");
    private static final Map<String, String> FACULTY_PREFIXES = Map.of(
            "IT", "IT",
            "INFORMATION TECHNOLOGY", "IT",
            "CS", "CS",
            "COMPUTER SCIENCE", "CS",
            "BM", "BM",
            "BUSINESS MANAGEMENT", "BM",
            "HM", "HM",
            "HOSPITALITY MANAGEMENT", "HM"
    );
    private static final String PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
    private static final String STUDENT_ID_PATTERN = "^(IT|CS|BM|HM)\\d{8}$";
    private static final String PHONE_PATTERN = "^\\+94 7\\d{8}$";

    private final AuthUserRepository authUserRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final TechnicianInviteRepository technicianInviteRepository;
    private final AuthMailService authMailService;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties authProperties;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(AuthUserRepository authUserRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       EmailVerificationTokenRepository emailVerificationTokenRepository,
                       TechnicianInviteRepository technicianInviteRepository,
                       AuthMailService authMailService,
                       PasswordEncoder passwordEncoder,
                       AuthProperties authProperties) {
        this.authUserRepository = authUserRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.technicianInviteRepository = technicianInviteRepository;
        this.authMailService = authMailService;
        this.passwordEncoder = passwordEncoder;
        this.authProperties = authProperties;
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String normalizedEmail = normalizeEmail(request.email());
        AuthBootstrapSupport.ensureRelevantAccounts(normalizedEmail, authProperties, authUserRepository, passwordEncoder);
        AuthUser user = authUserRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        ensureAccountCanAuthenticate(user);
        if (user.getAuthProviderType() == AuthProviderType.GOOGLE) {
            throw new BadCredentialsException("This account uses Google sign-in. Please continue with Google.");
        }
        if (!StringUtils.hasText(user.getPasswordHash()) || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password.");
        }

        establishSession(user, httpRequest, httpResponse);
        return new AuthResponse(toResponse(user));
    }

    public void establishSession(AuthUser user, HttpServletRequest request, HttpServletResponse response) {
        AuthUserPrincipal principal = new AuthUserPrincipal(user);
        Authentication authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                principal,
                null,
                principal.getAuthorities()
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    public AuthResponse register(RegisterRequest request) {
        NormalizedRegistration normalized = normalizeRegistration(request);
        validateStudentProfile(normalized.profile());
        validatePasswordChange(normalized.password(), normalized.confirmPassword());

        Optional<AuthUser> existingByStudentId = authUserRepository.findByStudentId(normalized.profile().studentId());
        if (existingByStudentId.isPresent() && !existingByStudentId.get().getEmail().equals(normalized.profile().email())) {
            throw new ApiValidationException("Validation failed", Map.of("studentId", "a student ID can register using one email only"));
        }

        AuthUser existingByEmail = authUserRepository.findByEmail(normalized.profile().email()).orElse(null);
        if (existingByEmail != null) {
            throw new ApiValidationException("Validation failed", Map.of("email", existingByEmail.getAuthProviderType() == AuthProviderType.GOOGLE
                    ? "This account uses Google sign-in. Please continue with Google."
                    : "An account already exists with this email address."));
        }

        AuthUser newUser = new AuthUser();
        newUser.setPublicId(generatePublicId("student"));
        newUser.setFullName(normalized.profile().fullName());
        newUser.setEmail(normalized.profile().email());
        newUser.setPasswordHash(passwordEncoder.encode(normalized.password()));
        newUser.setRole(UserRole.STUDENT);
        newUser.setStatus(AccountStatus.PENDING_VERIFICATION);
        newUser.setAuthProviderType(AuthProviderType.LOCAL);
        newUser.setEmailVerified(false);
        newUser.setAcceptedTermsAt(OffsetDateTime.now());
        applyStudentProfile(newUser, normalized.profile());
        authUserRepository.save(newUser);

        String rawToken = generateRawToken();
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(newUser);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(OffsetDateTime.now().plusHours(authProperties.getVerificationTokenHours()));
        emailVerificationTokenRepository.save(token);
        authMailService.sendVerificationEmail(newUser, buildFrontendLink("/verify-email", rawToken));

        return new AuthResponse(toResponse(newUser));
    }

    public void requestPasswordReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        AuthUser user = authUserRepository.findByEmail(email).orElse(null);
        if (user == null
                || user.getStatus() == AccountStatus.DISABLED
                || user.getStatus() == AccountStatus.INVITED
                || user.getAuthProviderType() == AuthProviderType.GOOGLE) {
            return;
        }

        passwordResetTokenRepository.findByUser_Id(user.getId()).forEach(existing -> {
            if (existing.getUsedAt() == null) {
                existing.setUsedAt(OffsetDateTime.now());
            }
        });

        String rawToken = generateRawToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(OffsetDateTime.now().plusHours(authProperties.getResetTokenHours()));
        passwordResetTokenRepository.save(token);
        authMailService.sendPasswordResetEmail(user, buildFrontendLink("/reset-password", rawToken));
    }

    public void resetPassword(ResetPasswordRequest request) {
        validatePasswordChange(request.password(), request.confirmPassword());
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(hashToken(request.token()))
                .orElseThrow(() -> new IllegalArgumentException("This password reset link is invalid or has expired."));
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("This password reset link is invalid or has expired.");
        }

        AuthUser user = token.getUser();
        if (user.getAuthProviderType() == AuthProviderType.GOOGLE) {
            throw new IllegalArgumentException("This account uses Google sign-in and does not have a local password.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        token.setUsedAt(OffsetDateTime.now());
        passwordResetTokenRepository.save(token);
        authUserRepository.save(user);
    }

    public void verifyEmail(String rawToken) {
        EmailVerificationToken token = emailVerificationTokenRepository.findByTokenHash(hashToken(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("This verification link is invalid or has expired."));
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("This verification link is invalid or has expired.");
        }

        AuthUser user = token.getUser();
        user.setEmailVerified(true);
        if (user.getStatus() == AccountStatus.PENDING_VERIFICATION) {
            user.setStatus(AccountStatus.ACTIVE);
        }
        token.setUsedAt(OffsetDateTime.now());
        authUserRepository.save(user);
        emailVerificationTokenRepository.save(token);
    }

    public GoogleAuthenticationResult handleGoogleLogin(String googleId, String email, String fullName, boolean emailVerified) {
        if (!emailVerified || !StringUtils.hasText(email)) {
            throw new BadCredentialsException("Google login requires a verified email address.");
        }

        String normalizedEmail = normalizeEmail(email);
        AuthUser linkedByGoogleId = authUserRepository.findByGoogleId(googleId).orElse(null);
        if (linkedByGoogleId != null) {
            return GoogleAuthenticationResult.authenticated(prepareGoogleStudentLogin(linkedByGoogleId, googleId, normalizedEmail, fullName));
        }

        AuthUser existingByEmail = authUserRepository.findByEmail(normalizedEmail).orElse(null);
        if (existingByEmail != null) {
            return GoogleAuthenticationResult.authenticated(prepareGoogleStudentLogin(existingByEmail, googleId, normalizedEmail, fullName));
        }

        return GoogleAuthenticationResult.onboardingRequired(new GoogleOnboardingState(
                googleId,
                normalizedEmail,
                StringUtils.hasText(fullName) ? fullName.trim() : normalizedEmail,
                OffsetDateTime.now()
        ));
    }

    public GoogleOnboardingResponse getGoogleOnboarding(HttpServletRequest request) {
        GoogleOnboardingState state = requireGoogleOnboardingState(request);
        return new GoogleOnboardingResponse(state.email(), state.fullName());
    }

    public AuthResponse completeGoogleOnboarding(GoogleOnboardingRequest request,
                                                 HttpServletRequest httpRequest,
                                                 HttpServletResponse httpResponse) {
        GoogleOnboardingState state = requireGoogleOnboardingState(httpRequest);
        NormalizedStudentProfile profile = normalizeGoogleOnboarding(request, state);
        validateStudentProfile(profile);

        Optional<AuthUser> existingByStudentId = authUserRepository.findByStudentId(profile.studentId());
        if (existingByStudentId.isPresent() && !existingByStudentId.get().getEmail().equals(profile.email())) {
            throw new ApiValidationException("Validation failed", Map.of("studentId", "a student ID can register using one email only"));
        }

        AuthUser existingByEmail = authUserRepository.findByEmail(profile.email()).orElse(null);
        if (existingByEmail != null) {
            if (existingByEmail.getAuthProviderType() == AuthProviderType.GOOGLE
                    && UserRole.STUDENT == existingByEmail.getRole()
                    && state.googleId().equals(existingByEmail.getGoogleId())) {
                applyStudentProfile(existingByEmail, profile);
                existingByEmail.setAcceptedTermsAt(OffsetDateTime.now());
                existingByEmail.setStatus(AccountStatus.ACTIVE);
                existingByEmail.setEmailVerified(true);
                authUserRepository.save(existingByEmail);
                clearGoogleOnboardingState(httpRequest);
                establishSession(existingByEmail, httpRequest, httpResponse);
                return new AuthResponse(toResponse(existingByEmail));
            }
            throw new ApiValidationException("Validation failed", Map.of("email", existingByEmail.getAuthProviderType() == AuthProviderType.GOOGLE
                    ? "This account uses Google sign-in. Please continue with Google."
                    : "An account already exists with this email address."));
        }

        AuthUser user = new AuthUser();
        user.setPublicId(generatePublicId("student"));
        user.setFullName(profile.fullName());
        user.setEmail(profile.email());
        user.setRole(UserRole.STUDENT);
        user.setStatus(AccountStatus.ACTIVE);
        user.setAuthProviderType(AuthProviderType.GOOGLE);
        user.setGoogleId(state.googleId());
        user.setEmailVerified(true);
        user.setAcceptedTermsAt(OffsetDateTime.now());
        applyStudentProfile(user, profile);
        authUserRepository.save(user);

        clearGoogleOnboardingState(httpRequest);
        establishSession(user, httpRequest, httpResponse);
        return new AuthResponse(toResponse(user));
    }

    public InviteDetailsResponse getInviteDetails(String rawToken) {
        TechnicianInvite invite = technicianInviteRepository.findByTokenHash(hashToken(rawToken))
                .orElseThrow(() -> new EntityNotFoundException("Invite was not found."));
        return new InviteDetailsResponse(
                invite.getEmail(),
                invite.getFullName(),
                inviteStatus(invite),
                invite.getExpiresAt()
        );
    }

    public AuthResponse acceptTechnicianInvite(InviteAcceptanceRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        validatePasswordChange(request.password(), request.confirmPassword());
        TechnicianInvite invite = technicianInviteRepository.findByTokenHash(hashToken(request.token()))
                .orElseThrow(() -> new IllegalArgumentException("This invite link is invalid or has expired."));
        if (invite.getRevokedAt() != null || invite.getAcceptedAt() != null || invite.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("This invite link is invalid or has expired.");
        }

        AuthUser user = invite.getUser();
        user.setFullName(invite.getFullName());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.TECHNICIAN);
        user.setStatus(AccountStatus.ACTIVE);
        user.setAuthProviderType(AuthProviderType.LOCAL);
        user.setGoogleId(null);
        user.setEmailVerified(true);
        invite.setAcceptedAt(OffsetDateTime.now());

        authUserRepository.save(user);
        technicianInviteRepository.save(invite);
        establishSession(user, httpRequest, httpResponse);
        return new AuthResponse(toResponse(user));
    }

    public AuthUserResponse toResponse(AuthUser user) {
        return new AuthUserResponse(
                user.getPublicId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.getAuthProviderType(),
                user.isEmailVerified(),
                user.getStudentId(),
                user.getFaculty(),
                user.getBatch(),
                user.getCampus(),
                user.getPhone(),
                user.getCreatedAt()
        );
    }

    public AuthUser requireUser(String publicId) {
        return authUserRepository.findByPublicId(publicId)
                .orElseThrow(() -> new EntityNotFoundException("User was not found."));
    }

    private void ensureAccountCanAuthenticate(AuthUser user) {
        if (user.getStatus() == AccountStatus.DISABLED || user.getStatus() == AccountStatus.INVITED) {
            throw new BadCredentialsException("This account is currently disabled.");
        }
        if (user.getStatus() == AccountStatus.PENDING_VERIFICATION && !user.isEmailVerified()) {
            throw new BadCredentialsException("Please verify your email before signing in.");
        }
    }

    private NormalizedRegistration normalizeRegistration(RegisterRequest request) {
        return new NormalizedRegistration(
                new NormalizedStudentProfile(
                        safeTrim(request.fullName()),
                        normalizeEmail(request.email()),
                        safeTrim(request.studentId()).toUpperCase(Locale.ROOT),
                        normalizeFaculty(request.faculty()),
                        safeTrim(request.batch()),
                        safeTrim(request.campus()).toLowerCase(Locale.ROOT),
                        safeTrim(request.phone()),
                        Boolean.TRUE.equals(request.acceptedTerms())
                ),
                request.password(),
                request.confirmPassword()
        );
    }

    private NormalizedStudentProfile normalizeGoogleOnboarding(GoogleOnboardingRequest request, GoogleOnboardingState state) {
        return new NormalizedStudentProfile(
                safeTrim(request.fullName()),
                state.email(),
                safeTrim(request.studentId()).toUpperCase(Locale.ROOT),
                normalizeFaculty(request.faculty()),
                safeTrim(request.batch()),
                safeTrim(request.campus()).toLowerCase(Locale.ROOT),
                safeTrim(request.phone()),
                Boolean.TRUE.equals(request.acceptedTerms())
        );
    }

    private void validateStudentProfile(NormalizedStudentProfile request) {
        Map<String, String> errors = new LinkedHashMap<>();

        if (!StringUtils.hasText(request.fullName())) {
            errors.put("fullName", "Full name is required.");
        }
        if (!StringUtils.hasText(request.email()) || !request.email().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            errors.put("email", "Enter a valid email address.");
        }
        if (!StringUtils.hasText(request.studentId()) || !request.studentId().matches(STUDENT_ID_PATTERN)) {
            errors.put("studentId", "Student ID must match the required format.");
        }
        if (!StringUtils.hasText(request.faculty()) || !FACULTY_PREFIXES.containsValue(request.faculty())) {
            errors.put("faculty", "Select a valid faculty.");
        }
        if (StringUtils.hasText(request.studentId()) && StringUtils.hasText(request.faculty())) {
            String prefix = request.studentId().substring(0, 2);
            if (!prefix.equals(request.faculty())) {
                errors.put("studentId", "Student ID prefix must match the selected faculty.");
            }
        }
        if (!StringUtils.hasText(request.batch()) || !request.batch().matches("^\\d{4}$")) {
            errors.put("batch", "Batch must be a 4 digit year.");
        }
        if (StringUtils.hasText(request.batch()) && StringUtils.hasText(request.studentId()) && request.studentId().length() >= 6) {
            String encodedYear = request.studentId().substring(2, 6);
            if (!encodedYear.equals(request.batch())) {
                errors.put("batch", "Batch must match the year encoded in the student ID.");
            }
        }
        if (!StringUtils.hasText(request.campus()) || !ALLOWED_CAMPUSES.contains(request.campus())) {
            errors.put("campus", "Select a valid campus.");
        }
        if (!StringUtils.hasText(request.phone()) || !request.phone().matches(PHONE_PATTERN)) {
            errors.put("phone", "Phone must match +94 7XXXXXXXX.");
        }
        if (!request.acceptedTerms()) {
            errors.put("acceptedTerms", "You must accept the terms to continue.");
        }

        if (!errors.isEmpty()) {
            throw new ApiValidationException("Validation failed", errors);
        }
    }

    private void applyStudentProfile(AuthUser user, NormalizedStudentProfile request) {
        user.setFullName(request.fullName());
        user.setStudentId(request.studentId());
        user.setFaculty(request.faculty());
        user.setBatch(request.batch());
        user.setCampus(request.campus());
        user.setPhone(request.phone());
        if (user.getRole() == null) {
            user.setRole(UserRole.STUDENT);
        }
        if (!user.isEmailVerified()) {
            user.setStatus(AccountStatus.PENDING_VERIFICATION);
        } else if (user.getStatus() == null || user.getStatus() == AccountStatus.PENDING_VERIFICATION) {
            user.setStatus(AccountStatus.ACTIVE);
        }
    }

    private void validatePasswordChange(String password, String confirmPassword) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (!StringUtils.hasText(password) || !password.matches(PASSWORD_PATTERN)) {
            errors.put("password", "Password must meet the minimum strength requirements.");
        }
        if (!StringUtils.hasText(confirmPassword) || !password.equals(confirmPassword)) {
            errors.put("confirmPassword", "Passwords do not match.");
        }
        if (!errors.isEmpty()) {
            throw new ApiValidationException("Validation failed", errors);
        }
    }

    private AuthUser prepareGoogleStudentLogin(AuthUser user, String googleId, String normalizedEmail, String fullName) {
        ensureAccountCanAuthenticate(user);
        if (!user.getEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new BadCredentialsException("This Google account is already linked to another user.");
        }
        if (user.getRole() != UserRole.STUDENT || user.getAuthProviderType() != AuthProviderType.GOOGLE) {
            throw new BadCredentialsException("This account uses email and password. Please sign in with local login.");
        }
        if (StringUtils.hasText(user.getGoogleId()) && !user.getGoogleId().equals(googleId)) {
            throw new BadCredentialsException("This Google account is already linked to another user.");
        }
        if (!StringUtils.hasText(user.getGoogleId())) {
            user.setGoogleId(googleId);
        }
        if (!StringUtils.hasText(user.getFullName()) && StringUtils.hasText(fullName)) {
            user.setFullName(fullName.trim());
        }
        user.setEmailVerified(true);
        return authUserRepository.save(user);
    }

    private GoogleOnboardingState requireGoogleOnboardingState(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            throw new IllegalArgumentException("Your Google onboarding session has expired. Please continue with Google again.");
        }
        Object value = session.getAttribute(GOOGLE_ONBOARDING_SESSION_KEY);
        if (!(value instanceof GoogleOnboardingState state)) {
            throw new IllegalArgumentException("Your Google onboarding session has expired. Please continue with Google again.");
        }
        return state;
    }

    private void clearGoogleOnboardingState(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.removeAttribute(GOOGLE_ONBOARDING_SESSION_KEY);
        }
    }

    private String normalizeEmail(String email) {
        return safeTrim(email).toLowerCase(Locale.ROOT);
    }

    private String normalizeFaculty(String faculty) {
        return FACULTY_PREFIXES.getOrDefault(safeTrim(faculty).toUpperCase(Locale.ROOT), "");
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String generatePublicId(String prefix) {
        return prefix + "-" + Math.abs(secureRandom.nextInt(1_000_000));
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    digest.digest(rawToken.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private String buildFrontendLink(String path, String token) {
        return authProperties.getFrontendBaseUrl() + path + "?token=" + token;
    }

    private String inviteStatus(TechnicianInvite invite) {
        if (invite.getRevokedAt() != null) {
            return "REVOKED";
        }
        if (invite.getAcceptedAt() != null) {
            return "ACCEPTED";
        }
        if (invite.getExpiresAt().isBefore(OffsetDateTime.now())) {
            return "EXPIRED";
        }
        return "PENDING";
    }

    private record NormalizedRegistration(
            NormalizedStudentProfile profile,
            String password,
            String confirmPassword
    ) {
    }

    private record NormalizedStudentProfile(
            String fullName,
            String email,
            String studentId,
            String faculty,
            String batch,
            String campus,
            String phone,
            boolean acceptedTerms
    ) {
    }

    public record GoogleAuthenticationResult(
            AuthUser user,
            GoogleOnboardingState onboardingState,
            boolean onboardingRequired
    ) {
        public static GoogleAuthenticationResult authenticated(AuthUser user) {
            return new GoogleAuthenticationResult(user, null, false);
        }

        public static GoogleAuthenticationResult onboardingRequired(GoogleOnboardingState onboardingState) {
            return new GoogleAuthenticationResult(null, onboardingState, true);
        }
    }

    public record GoogleOnboardingState(
            String googleId,
            String email,
            String fullName,
            OffsetDateTime authenticatedAt
    ) {
    }
}
