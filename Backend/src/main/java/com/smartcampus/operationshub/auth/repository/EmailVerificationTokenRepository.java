package com.smartcampus.operationshub.auth.repository;

import com.smartcampus.operationshub.auth.domain.EmailVerificationToken;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    List<EmailVerificationToken> findByUser_Id(Long userId);
}
