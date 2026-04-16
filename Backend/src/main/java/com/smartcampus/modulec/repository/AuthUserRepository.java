package com.smartcampus.modulec.repository;

import com.smartcampus.modulec.domain.AuthUser;
import com.smartcampus.modulec.domain.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthUserRepository extends JpaRepository<AuthUser, Long> {

    Optional<AuthUser> findByEmail(String email);

    Optional<AuthUser> findByGoogleId(String googleId);

    Optional<AuthUser> findByPublicId(String publicId);

    Optional<AuthUser> findByStudentId(String studentId);

    List<AuthUser> findByRole(UserRole role);
}
