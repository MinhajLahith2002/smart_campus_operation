package com.smartcampus.modulec.config;

import com.smartcampus.modulec.domain.AccountStatus;
import com.smartcampus.modulec.domain.AuthProviderType;
import com.smartcampus.modulec.domain.AuthUser;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.repository.AuthUserRepository;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

@Configuration
public class AuthBootstrapConfig {

    @Bean
    public CommandLineRunner bootstrapAdmin(AuthProperties authProperties,
                                            AuthUserRepository authUserRepository,
                                            PasswordEncoder passwordEncoder) {
        return args -> {
            AuthProperties.BootstrapAdmin bootstrapAdmin = authProperties.getBootstrapAdmin();
            if (!StringUtils.hasText(bootstrapAdmin.getEmail()) || !StringUtils.hasText(bootstrapAdmin.getPassword())) {
                bootstrapSampleUsers(authProperties, authUserRepository, passwordEncoder);
                return;
            }

            String email = bootstrapAdmin.getEmail().trim().toLowerCase(Locale.ROOT);
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

            bootstrapSampleUsers(authProperties, authUserRepository, passwordEncoder);
        };
    }

    private void bootstrapSampleUsers(AuthProperties authProperties,
                                      AuthUserRepository authUserRepository,
                                      PasswordEncoder passwordEncoder) {
        AuthProperties.SampleUsers sampleUsers = authProperties.getSampleUsers();
        if (!sampleUsers.isEnabled()) {
            return;
        }

        seedStudent(sampleUsers.getStudent(), authUserRepository, passwordEncoder);
        seedTechnician(sampleUsers.getTechnician(), authUserRepository, passwordEncoder);
    }

    private void seedStudent(AuthProperties.SampleStudent student,
                             AuthUserRepository authUserRepository,
                             PasswordEncoder passwordEncoder) {
        if (!hasBasicSeedValues(student)) {
            return;
        }

        String email = normalizeEmail(student.getEmail());
        AuthUser user = findSeedUser(authUserRepository, "sample-student", email);
        if (!StringUtils.hasText(user.getPublicId())) {
            user.setPublicId("sample-student");
        }
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

    private void seedTechnician(AuthProperties.SampleAccount technician,
                                AuthUserRepository authUserRepository,
                                PasswordEncoder passwordEncoder) {
        if (!hasBasicSeedValues(technician)) {
            return;
        }

        String email = normalizeEmail(technician.getEmail());
        AuthUser user = findSeedUser(authUserRepository, "sample-technician", email);
        if (!StringUtils.hasText(user.getPublicId())) {
            user.setPublicId("sample-technician");
        }
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

    private boolean hasBasicSeedValues(AuthProperties.SampleAccount account) {
        return StringUtils.hasText(account.getEmail())
                && StringUtils.hasText(account.getPassword())
                && StringUtils.hasText(account.getFullName());
    }

    private AuthUser findSeedUser(AuthUserRepository authUserRepository, String publicId, String email) {
        Optional<AuthUser> existingByPublicId = authUserRepository.findByPublicId(publicId);
        if (existingByPublicId.isPresent()) {
            return existingByPublicId.get();
        }
        return authUserRepository.findByEmail(email).orElseGet(AuthUser::new);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
