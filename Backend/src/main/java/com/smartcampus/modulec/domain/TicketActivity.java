package com.smartcampus.modulec.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import com.smartcampus.operationshub.auth.domain.UserRole;

@Entity
@Table(name = "ticket_activities")
public class TicketActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    @Column(nullable = false, length = 120)
    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private UserRole actorRole;

    @Column(nullable = false, length = 160)
    private String action;

    @Column(nullable = false, length = 2000)
    private String detail;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Ticket getTicket() { return ticket; }
    public void setTicket(Ticket ticket) { this.ticket = ticket; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public UserRole getActorRole() { return actorRole; }
    public void setActorRole(UserRole actorRole) { this.actorRole = actorRole; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
