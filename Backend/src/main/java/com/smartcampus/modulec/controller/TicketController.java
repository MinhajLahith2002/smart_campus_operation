package com.smartcampus.modulec.controller;

import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.dto.AssignTechnicianRequest;
import com.smartcampus.modulec.dto.CreateTicketRequest;
import com.smartcampus.modulec.dto.TicketCommentRequest;
import com.smartcampus.modulec.dto.TicketCommentResponse;
import com.smartcampus.modulec.dto.TicketDecisionRequest;
import com.smartcampus.modulec.dto.TicketQuery;
import com.smartcampus.modulec.dto.TicketResponse;
import com.smartcampus.modulec.dto.TicketSummaryResponse;
import com.smartcampus.modulec.dto.UpdateTicketStatusRequest;
import com.smartcampus.modulec.service.TicketService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public TicketResponse getTicket(
            @PathVariable Long ticketId,
            @RequestParam @NotNull UserRole requesterRole,
            @RequestParam(required = false) @Size(max = 80) String requesterId) {
        return ticketService.getTicket(ticketId, requesterId, requesterRole);
    }

    @PutMapping("/{ticketId}")
    public TicketResponse updateTicket(@PathVariable Long ticketId, @Valid @RequestBody CreateTicketRequest request) {
        return ticketService.updateTicket(ticketId, request);
    }

    @DeleteMapping("/{ticketId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTicket(@PathVariable Long ticketId, @Valid @RequestBody TicketDecisionRequest request) {
        ticketService.deleteTicket(ticketId, request);
    }

    @PatchMapping("/{ticketId}/assign")
    public TicketResponse assignTechnician(@PathVariable Long ticketId, @Valid @RequestBody AssignTechnicianRequest request) {
        return ticketService.assignTechnician(ticketId, request);
    }

    @PatchMapping("/{ticketId}/status")
    public TicketResponse updateStatus(@PathVariable Long ticketId, @Valid @RequestBody UpdateTicketStatusRequest request) {
        return ticketService.updateStatus(ticketId, request);
    }

    @PatchMapping("/{ticketId}/close")
    public TicketResponse closeTicket(@PathVariable Long ticketId, @Valid @RequestBody TicketDecisionRequest request) {
        return ticketService.closeTicket(ticketId, request);
    }

    @PatchMapping("/{ticketId}/reopen")
    public TicketResponse reopenTicket(@PathVariable Long ticketId, @Valid @RequestBody TicketDecisionRequest request) {
        return ticketService.reopenTicket(ticketId, request);
    }

    @PostMapping("/{ticketId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketCommentResponse addComment(@PathVariable Long ticketId, @Valid @RequestBody TicketCommentRequest request) {
        return ticketService.addComment(ticketId, request);
    }

    @PutMapping("/comments/{commentId}")
    public TicketCommentResponse updateComment(@PathVariable Long commentId, @Valid @RequestBody TicketCommentRequest request) {
        return ticketService.updateComment(commentId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId, @Valid @RequestBody TicketDecisionRequest request) {
        ticketService.deleteComment(commentId, request);
    }

    @GetMapping("/summary")
    public TicketSummaryResponse getSummary() {
        return ticketService.getSummary();
    }
}
