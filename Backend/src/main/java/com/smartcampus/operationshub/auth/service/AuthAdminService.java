package com.smartcampus.operationshub.auth.service;

import com.smartcampus.operationshub.auth.config.AuthProperties;
import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.TechnicianInvite;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.dto.AuthUserResponse;
import com.smartcampus.operationshub.auth.dto.CreateUserInviteRequest;
import com.smartcampus.operationshub.auth.dto.UpdateUserStatusRequest;
import com.smartcampus.operationshub.auth.dto.UserInviteResponse;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import com.smartcampus.operationshub.auth.repository.TechnicianInviteRepository;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthAdminService {

    private final AuthUserRepository authUserRepository;
    private final TechnicianInviteRepository technicianInviteRepository;
    private final AuthMailService authMailService;
    private final AuthProperties authProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthAdminService(AuthUserRepository authUserRepository,
                            TechnicianInviteRepository technicianInviteRepository,
                            AuthMailService authMailService,
                            AuthProperties authProperties) {
        this.authUserRepository = authUserRepository;
        this.technicianInviteRepository = technicianInviteRepository;
        this.authMailService = authMailService;
        this.authProperties = authProperties;
    }

    @Transactional(readOnly = true)
    public List<AuthUserResponse> getUsers(String query,
                                           UserRole role,
                                           AccountStatus status,
                                           AuthProviderType provider,
                                           AuthService authService) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);

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

    public UserInviteResponse createInvite(CreateUserInviteRequest request, AuthUserPrincipal admin) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String fullName = request.fullName().trim();
        UserRole invitedRole = normalizeInvitedRole(request.role());
        AuthUser user = authUserRepository.findByEmail(email).orElse(null);

        if (user != null && user.getRole() != invitedRole) {
            throw new IllegalArgumentException("That email address is already used by a %s account.".formatted(formatRole(user.getRole())));
        }
        if (user != null && user.getRole() == invitedRole && user.getStatus() == AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("That %s account is already active.".formatted(formatRole(invitedRole)));
        }
        if (user == null) {
            user = new AuthUser();
            user.setPublicId(generatePublicId(invitedRole));
            user.setFullName(fullName);
            user.setEmail(email);
            user.setRole(invitedRole);
            user.setStatus(AccountStatus.INVITED);
            user.setAuthProviderType(AuthProviderType.LOCAL);
            user.setEmailVerified(false);
        } else {
            user.setFullName(fullName);
            user.setRole(invitedRole);
            user.setStatus(AccountStatus.INVITED);
            user.setEmailVerified(false);
        }
        authUserRepository.save(user);

        String rawToken = generateRawToken();
        TechnicianInvite invite = new TechnicianInvite();
        invite.setUser(user);
        invite.setEmail(email);
        invite.setFullName(fullName);
        invite.setInvitedRole(invitedRole);
        invite.setInvitedByUserId(admin.getPublicId());
        invite.setInvitedByName(admin.getFullName());
        invite.setTokenHash(hashToken(rawToken));
        invite.setExpiresAt(OffsetDateTime.now().plusHours(authProperties.getInviteTokenHours()));
        technicianInviteRepository.save(invite);

        authMailService.sendUserInviteEmail(invite, authProperties.getFrontendBaseUrl() + "/invite/setup?token=" + rawToken);
        return toInviteResponse(invite);
    }

    @Transactional(readOnly = true)
    public List<UserInviteResponse> getInvites() {
        return technicianInviteRepository.findAll().stream()
                .map(this::toInviteResponse)
                .toList();
    }

    public UserInviteResponse resendInvite(Long inviteId) {
        TechnicianInvite invite = technicianInviteRepository.findById(inviteId)
                .orElseThrow(() -> new EntityNotFoundException("Invite was not found."));
        if (invite.getAcceptedAt() != null || invite.getRevokedAt() != null) {
            throw new IllegalArgumentException("Only pending invites can be resent.");
        }

        String rawToken = generateRawToken();
        invite.setTokenHash(hashToken(rawToken));
        invite.setExpiresAt(OffsetDateTime.now().plusHours(authProperties.getInviteTokenHours()));
        technicianInviteRepository.save(invite);
        authMailService.sendUserInviteEmail(invite, authProperties.getFrontendBaseUrl() + "/invite/setup?token=" + rawToken);
        return toInviteResponse(invite);
    }

    public UserInviteResponse revokeInvite(Long inviteId) {
        TechnicianInvite invite = technicianInviteRepository.findById(inviteId)
                .orElseThrow(() -> new EntityNotFoundException("Invite was not found."));
        if (invite.getAcceptedAt() != null) {
            throw new IllegalArgumentException("Accepted invites cannot be revoked.");
        }

        invite.setRevokedAt(OffsetDateTime.now());
        invite.getUser().setStatus(AccountStatus.DISABLED);
        return toInviteResponse(invite);
    }

    private UserInviteResponse toInviteResponse(TechnicianInvite invite) {
        String status = invite.getRevokedAt() != null
                ? "REVOKED"
                : invite.getAcceptedAt() != null
                ? "ACCEPTED"
                : invite.getExpiresAt().isBefore(OffsetDateTime.now())
                ? "EXPIRED"
                : "PENDING";

        return new UserInviteResponse(
                invite.getId(),
                invite.getEmail(),
                invite.getFullName(),
                invite.getInvitedRole(),
                status,
                invite.getCreatedAt(),
                invite.getExpiresAt(),
                invite.getAcceptedAt()
        );
    }

    private UserRole normalizeInvitedRole(UserRole requestedRole) {
        if (requestedRole == null || !EnumSet.of(UserRole.ADMIN, UserRole.TECHNICIAN).contains(requestedRole)) {
            throw new IllegalArgumentException("Only ADMIN or TECHNICIAN invites can be created from user management.");
        }
        return requestedRole;
    }

    private String generatePublicId(UserRole invitedRole) {
        String prefix = invitedRole == UserRole.ADMIN ? "admin" : "tech";
        return prefix + "-" + Math.abs(secureRandom.nextInt(1_000_000));
    }

    private String formatRole(UserRole role) {
        return role.name().toLowerCase(Locale.ROOT);
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
