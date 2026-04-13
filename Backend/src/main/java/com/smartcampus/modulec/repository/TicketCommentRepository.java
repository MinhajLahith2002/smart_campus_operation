package com.smartcampus.modulec.repository;

import com.smartcampus.modulec.domain.TicketComment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketCommentRepository extends JpaRepository<TicketComment, Long> {
}
