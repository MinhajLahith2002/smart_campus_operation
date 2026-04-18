package com.smartcampus.operationshub.auth.repository;

import com.smartcampus.operationshub.auth.domain.TechnicianInvite;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TechnicianInviteRepository extends JpaRepository<TechnicianInvite, Long> {

    Optional<TechnicianInvite> findByTokenHash(String tokenHash);

    List<TechnicianInvite> findByUser_Id(Long userId);

    Optional<TechnicianInvite> findTopByEmailOrderByCreatedAtDesc(String email);
}
