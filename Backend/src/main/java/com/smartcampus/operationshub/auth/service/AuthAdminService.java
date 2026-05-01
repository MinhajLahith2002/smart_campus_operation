package com.smartcampus.operationshub.auth.service;

import com.smartcampus.operationshub.config.AuthProperties;
import com.smartcampus.operationshub.config.AuthBootstrapSupport;
import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.TechnicianInvite;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.dto.AuthUserResponse;
import com.smartcampus.operationshub.auth.dto.CreateTechnicianInviteRequest;
import com.smartcampus.operationshub.auth.dto.TechnicianInviteResponse;
import com.smartcampus.operationshub.auth.dto.UpdateUserStatusRequest;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.repository.TechnicianInviteRepository;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class AuthAdminService {

    private final AuthUserRepository authUserRepository;
    private final TechnicianInviteRepository technicianInviteRepository;
    private final AuthMailService authMailService;
    private final AuthProperties authProperties;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthAdminService(AuthUserRepository authUserRepository,
                            TechnicianInviteRepository technicianInviteRepository,
                            AuthMailService authMailService,
                            AuthProperties authProperties,
                            PasswordEncoder passwordEncoder) {
        this.authUserRepository = authUserRepository;
        this.technicianInviteRepository = technicianInviteRepository;
        this.authMailService = authMailService;
        this.authProperties = authProperties;
        this.passwordEncoder = passwordEncoder;
    }

    public List<AuthUserResponse> getUsers(String query,
                                           UserRole role,
                                           AccountStatus status,
                                           AuthProviderType provider,
                                           AuthService authService) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        AuthBootstrapSupport.syncConfiguredAccounts(authProperties, authUserRepository, passwordEncoder);

        return authUserRepository.findAll().stream()
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> status == null || user.getStatus() == status)
                .filter(user -> provider == null || user.getAuthProviderType() == provider)
                .filter(user -> normalizedQuery.isBlank()
                        || user.getEmail().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                        || user.getFullName().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                        || (user.getStudentId() != null && user.getStudentId().toLowerCase(Locale.ROOT).contains(normalizedQuery)))
                .map(authService::toResponse)
                .toList();
    }

    public AuthUserResponse updateUserStatus(String publicId,
                                             UpdateUserStatusRequest request,
                                             AuthUserPrincipal admin,
                                             AuthService authService) {
        AuthUser user = authService.requireUser(publicId);
        if (user.getRole() == UserRole.ADMIN
                && user.getEmail().equalsIgnoreCase(admin.getEmail())
                && request.status() == AccountStatus.DISABLED) {
            throw new IllegalArgumentException("You cannot disable the currently signed-in admin account.");
        }
        if (request.status() != AccountStatus.ACTIVE && request.status() != AccountStatus.DISABLED) {
            throw new IllegalArgumentException("Only ACTIVE or DISABLED can be set from admin user management.");
        }

        user.setStatus(request.status());
        authUserRepository.save(user);
        return authService.toResponse(user);
    }

    public TechnicianInviteResponse createTechnicianInvite(CreateTechnicianInviteRequest request, AuthUserPrincipal admin) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String fullName = request.fullName().trim();
        AuthUser user = authUserRepository.findByEmail(email).orElse(null);

        if (user != null && user.getRole() != UserRole.TECHNICIAN) {
            throw new IllegalArgumentException("That email address is already used by a non-technician account.");
        }
        if (user != null && user.getRole() == UserRole.TECHNICIAN && user.getStatus() == AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("That technician account is already active.");
        }
        if (user == null) {
            user = new AuthUser();
            user.setPublicId("tech-" + Math.abs(secureRandom.nextInt(1_000_000)));
            user.setFullName(fullName);
            user.setEmail(email);
            user.setRole(UserRole.TECHNICIAN);
            user.setStatus(AccountStatus.INVITED);
            user.setAuthProviderType(AuthProviderType.LOCAL);
            user.setEmailVerified(false);
        } else {
            user.setFullName(fullName);
            user.setStatus(AccountStatus.INVITED);
        }
        authUserRepository.save(user);

        String rawToken = generateRawToken();
        TechnicianInvite invite = new TechnicianInvite();
        invite.setUser(user);
        invite.setEmail(email);
        invite.setFullName(fullName);
        invite.setInvitedByUserId(admin.getPublicId());
        invite.setInvitedByName(admin.getFullName());
        invite.setTokenHash(hashToken(rawToken));
        invite.setExpiresAt(OffsetDateTime.now().plusHours(authProperties.getInviteTokenHours()));
        technicianInviteRepository.save(invite);

        authMailService.sendTechnicianInviteEmail(invite, authProperties.getFrontendBaseUrl() + "/invite/setup?token=" + rawToken);
        return toInviteResponse(invite);
    }

    @Transactional(readOnly = true)
    public List<TechnicianInviteResponse> getInvites() {
        return technicianInviteRepository.findAll().stream()
                .map(this::toInviteResponse)
                .toList();
    }

    public TechnicianInviteResponse resendInvite(Long inviteId) {
        TechnicianInvite invite = technicianInviteRepository.findById(inviteId)
                .orElseThrow(() -> new EntityNotFoundException("Invite was not found."));
        if (invite.getAcceptedAt() != null || invite.getRevokedAt() != null) {
            throw new IllegalArgumentException("Only pending invites can be resent.");
        }

        String rawToken = generateRawToken();
        invite.setTokenHash(hashToken(rawToken));
        invite.setExpiresAt(OffsetDateTime.now().plusHours(authProperties.getInviteTokenHours()));
        technicianInviteRepository.save(invite);
        authMailService.sendTechnicianInviteEmail(invite, authProperties.getFrontendBaseUrl() + "/invite/setup?token=" + rawToken);
        return toInviteResponse(invite);
    }

    public TechnicianInviteResponse revokeInvite(Long inviteId) {
        TechnicianInvite invite = technicianInviteRepository.findById(inviteId)
                .orElseThrow(() -> new EntityNotFoundException("Invite was not found."));
        if (invite.getAcceptedAt() != null) {
            throw new IllegalArgumentException("Accepted invites cannot be revoked.");
        }

        invite.setRevokedAt(OffsetDateTime.now());
        invite.getUser().setStatus(AccountStatus.DISABLED);
        return toInviteResponse(invite);
    }

    private TechnicianInviteResponse toInviteResponse(TechnicianInvite invite) {
        String status = invite.getRevokedAt() != null
                ? "REVOKED"
                : invite.getAcceptedAt() != null
                ? "ACCEPTED"
                : invite.getExpiresAt().isBefore(OffsetDateTime.now())
                ? "EXPIRED"
                : "PENDING";

        return new TechnicianInviteResponse(
                invite.getId(),
                invite.getEmail(),
                invite.getFullName(),
                status,
                invite.getCreatedAt(),
                invite.getExpiresAt(),
                invite.getAcceptedAt()
        );
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
}
