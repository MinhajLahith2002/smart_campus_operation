package com.smartcampus.modulec.controller;

import com.smartcampus.modulec.dto.AssignTechnicianRequest;
import com.smartcampus.modulec.dto.CreateTicketRequest;
import com.smartcampus.modulec.dto.TicketQuery;
import com.smartcampus.modulec.dto.TicketResponse;
import com.smartcampus.modulec.dto.TicketSummaryResponse;
import com.smartcampus.modulec.dto.UpdateTicketStatusRequest;
import com.smartcampus.modulec.service.TicketService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/module-c/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse createTicket(@Valid @RequestBody CreateTicketRequest request) {
        return ticketService.createTicket(request);
    }

    @GetMapping
    public List<TicketResponse> getTickets(@Valid TicketQuery query) {
        return ticketService.getTickets(query);
    }

    @GetMapping("/{ticketId}")
    public TicketResponse getTicket(@PathVariable Long ticketId) {
        return ticketService.getTicket(ticketId);
    }

    @PatchMapping("/{ticketId}/assign")
    public TicketResponse assignTechnician(@PathVariable Long ticketId, @Valid @RequestBody AssignTechnicianRequest request) {
        return ticketService.assignTechnician(ticketId, request);
    }

    @PatchMapping("/{ticketId}/status")
    public TicketResponse updateStatus(@PathVariable Long ticketId, @Valid @RequestBody UpdateTicketStatusRequest request) {
        return ticketService.updateStatus(ticketId, request);
    }

    @GetMapping("/summary")
    public TicketSummaryResponse getSummary() {
        return ticketService.getSummary();
    }
}
