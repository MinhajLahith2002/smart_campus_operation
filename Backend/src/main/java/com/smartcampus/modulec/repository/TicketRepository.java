package com.smartcampus.modulec.repository;

import com.smartcampus.modulec.domain.Ticket;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    @EntityGraph(attributePaths = "evidenceItems")
    List<Ticket> findAllByOrderByUpdatedAtDesc();
}
