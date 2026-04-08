package com.smartcampus.modulec.repository;

import com.smartcampus.modulec.domain.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
}
