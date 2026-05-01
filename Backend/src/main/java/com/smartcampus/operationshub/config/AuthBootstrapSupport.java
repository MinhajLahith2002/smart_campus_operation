package com.smartcampus.operationshub.config;

import com.smartcampus.operationshub.auth.config.AuthProperties;
import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthProviderType;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.UserRole;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

public final class AuthBootstrapSupport {

    private AuthBootstrapSupport() {
    }

    public static void syncConfiguredAccounts(AuthProperties authProperties,
                                              AuthUserRepository authUserRepository,
                                              PasswordEncoder passwordEncoder) {
        AuthProperties.BootstrapAdmin bootstrapAdmin = authProperties.getBootstrapAdmin();
        if (StringUtils.hasText(bootstrapAdmin.getEmail()) && StringUtils.hasText(bootstrapAdmin.getPassword())) {
            String email = normalizeEmail(bootstrapAdmin.getEmail());
            AuthUser user = findSeedUser(authUserRepository, "admin-bootstrap", email);
            if (!StringUtils.hasText(user.getPublicId())) {
                user.setPublicId("admin-bootstrap");
            }
            user.setFullName(bootstrapAdmin.getFullName());
            user.setEmail(email);
            user.setRole(UserRole.ADMIN);
            user.setStatus(AccountStatus.ACTIVE);
            user.setAuthProviderType(AuthProviderType.LOCAL);
            user.setGoogleId(null);
            user.setEmailVerified(true);
            if (!StringUtils.hasText(user.getPasswordHash())) {
                user.setPasswordHash(passwordEncoder.encode(bootstrapAdmin.getPassword()));
            }
            authUserRepository.save(user);
        }

        AuthProperties.SampleUsers sampleUsers = authProperties.getSampleUsers();
        if (!sampleUsers.isEnabled()) {
            return;
        }

        seedStudent(sampleUsers.getStudent(), authUserRepository, passwordEncoder);
        seedTechnician(sampleUsers.getTechnician(), authUserRepository, passwordEncoder);
    }

    public static void ensureRelevantAccounts(String normalizedEmail,
                                              AuthProperties authProperties,
                                              AuthUserRepository authUserRepository,
                                              PasswordEncoder passwordEncoder) {
        if (!StringUtils.hasText(normalizedEmail)) {
            return;
        }
        String email = normalizedEmail.trim().toLowerCase(Locale.ROOT);
        AuthProperties.BootstrapAdmin bootstrapAdmin = authProperties.getBootstrapAdmin();
        AuthProperties.SampleUsers sampleUsers = authProperties.getSampleUsers();
        boolean matchesAdmin = StringUtils.hasText(bootstrapAdmin.getEmail())
                && email.equals(normalizeEmail(bootstrapAdmin.getEmail()));
        boolean matchesStudent = sampleUsers.isEnabled()
                && StringUtils.hasText(sampleUsers.getStudent().getEmail())
                && email.equals(normalizeEmail(sampleUsers.getStudent().getEmail()));
        boolean matchesTechnician = sampleUsers.isEnabled()
                && StringUtils.hasText(sampleUsers.getTechnician().getEmail())
                && email.equals(normalizeEmail(sampleUsers.getTechnician().getEmail()));
        if (matchesAdmin || matchesStudent || matchesTechnician) {
            syncConfiguredAccounts(authProperties, authUserRepository, passwordEncoder);
        }
    }

    private static void seedStudent(AuthProperties.SampleStudent student,
                                    AuthUserRepository authUserRepository,
                                    PasswordEncoder passwordEncoder) {
        if (!hasBasicSeedValues(student)) {
            return;
        }

        String email = normalizeEmail(student.getEmail());
        AuthUser user = findSeedUser(authUserRepository, "student-01", email);
        user.setPublicId("student-01");
        user.setFullName(student.getFullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(student.getPassword()));
        user.setRole(UserRole.STUDENT);
        user.setStatus(AccountStatus.ACTIVE);
        user.setAuthProviderType(AuthProviderType.LOCAL);
        user.setGoogleId(null);
        user.setEmailVerified(true);
        user.setStudentId(student.getStudentId().trim().toUpperCase(Locale.ROOT));
        user.setFaculty(student.getFaculty().trim().toUpperCase(Locale.ROOT));
        user.setBatch(student.getBatch().trim());
        user.setCampus(student.getCampus().trim().toLowerCase(Locale.ROOT));
        user.setPhone(student.getPhone().trim());
        if (user.getAcceptedTermsAt() == null) {
            user.setAcceptedTermsAt(OffsetDateTime.now());
        }
        authUserRepository.save(user);
    }

    private static void seedTechnician(AuthProperties.SampleAccount technician,
                                       AuthUserRepository authUserRepository,
                                       PasswordEncoder passwordEncoder) {
        if (!hasBasicSeedValues(technician)) {
            return;
        }

        String email = normalizeEmail(technician.getEmail());
        AuthUser user = findSeedUser(authUserRepository, "tech-17", email);
        user.setPublicId("tech-17");
        user.setFullName(technician.getFullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(technician.getPassword()));
        user.setRole(UserRole.TECHNICIAN);
        user.setStatus(AccountStatus.ACTIVE);
        user.setAuthProviderType(AuthProviderType.LOCAL);
        user.setGoogleId(null);
        user.setEmailVerified(true);
        user.setStudentId(null);
        user.setFaculty(null);
        user.setBatch(null);
        user.setCampus(null);
        user.setPhone(null);
        if (user.getAcceptedTermsAt() == null) {
            user.setAcceptedTermsAt(OffsetDateTime.now());
        }
        authUserRepository.save(user);
    }

    private static boolean hasBasicSeedValues(AuthProperties.SampleAccount account) {
        return StringUtils.hasText(account.getEmail())
                && StringUtils.hasText(account.getPassword())
                && StringUtils.hasText(account.getFullName());
    }

    private static AuthUser findSeedUser(AuthUserRepository authUserRepository, String publicId, String email) {
        Optional<AuthUser> existingByPublicId = authUserRepository.findByPublicId(publicId);
        if (existingByPublicId.isPresent()) {
            return existingByPublicId.get();
        }
        return authUserRepository.findByEmail(email).orElseGet(AuthUser::new);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
