package com.smartcampus.modulec.controller;

import com.smartcampus.modulec.dto.AssignTechnicianRequest;
import com.smartcampus.modulec.dto.CreateTicketRequest;
import com.smartcampus.modulec.dto.TicketCommentRequest;
import com.smartcampus.modulec.dto.TicketCommentResponse;
import com.smartcampus.modulec.dto.TicketDecisionRequest;
import com.smartcampus.modulec.dto.TicketQuery;
import com.smartcampus.modulec.dto.TicketResponse;
import com.smartcampus.modulec.dto.TicketSummaryResponse;
import com.smartcampus.modulec.dto.UpdateTicketStatusRequest;
import com.smartcampus.modulec.security.AuthUserPrincipal;
import com.smartcampus.modulec.service.TicketService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    public TicketResponse createTicket(@Valid @RequestBody CreateTicketRequest request,
                                       @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.createTicket(request, principal);
    }

    @GetMapping
    public List<TicketResponse> getTickets(@Valid TicketQuery query,
                                           @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.getTickets(query, principal);
    }

    @GetMapping("/{ticketId}")
    public TicketResponse getTicket(@PathVariable Long ticketId,
                                    @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.getTicket(ticketId, principal);
    }

    @PatchMapping("/{ticketId}/assign")
    public TicketResponse assignTechnician(@PathVariable Long ticketId,
                                           @Valid @RequestBody AssignTechnicianRequest request,
                                           @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.assignTechnician(ticketId, request, principal);
    }

    @PatchMapping("/{ticketId}/status")
    public TicketResponse updateStatus(@PathVariable Long ticketId,
                                       @Valid @RequestBody UpdateTicketStatusRequest request,
                                       @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.updateStatus(ticketId, request, principal);
    }

    @PatchMapping("/{ticketId}/close")
    public TicketResponse closeTicket(@PathVariable Long ticketId,
                                      @Valid @RequestBody TicketDecisionRequest request,
                                      @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.closeTicket(ticketId, request, principal);
    }

    @PatchMapping("/{ticketId}/reopen")
    public TicketResponse reopenTicket(@PathVariable Long ticketId,
                                       @Valid @RequestBody TicketDecisionRequest request,
                                       @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.reopenTicket(ticketId, request, principal);
    }

    @PostMapping("/{ticketId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketCommentResponse addComment(@PathVariable Long ticketId,
                                            @Valid @RequestBody TicketCommentRequest request,
                                            @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.addComment(ticketId, request, principal);
    }

    @PutMapping("/comments/{commentId}")
    public TicketCommentResponse updateComment(@PathVariable Long commentId,
                                               @Valid @RequestBody TicketCommentRequest request,
                                               @AuthenticationPrincipal AuthUserPrincipal principal) {
        return ticketService.updateComment(commentId, request, principal);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId,
                              @Valid @RequestBody TicketDecisionRequest request,
                              @AuthenticationPrincipal AuthUserPrincipal principal) {
        ticketService.deleteComment(commentId, request, principal);
    }

    @GetMapping("/summary")
    public TicketSummaryResponse getSummary() {
        return ticketService.getSummary();
    }
}
