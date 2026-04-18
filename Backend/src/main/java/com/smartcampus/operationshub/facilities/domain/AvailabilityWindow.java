package com.smartcampus.operationshub.facilities.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class AvailabilityWindow {

    @Column(name = "availability_days", nullable = false, length = 160)
    private String daysOfWeek;

    @Column(name = "available_from", nullable = false, length = 5)
    private String openTime;

    @Column(name = "available_to", nullable = false, length = 5)
    private String closeTime;

    @Column(name = "availability_notes", length = 300)
    private String notes;

    public String getDaysOfWeek() {
        return daysOfWeek;
    }

    public void setDaysOfWeek(String daysOfWeek) {
        this.daysOfWeek = daysOfWeek;
    }

    public String getOpenTime() {
        return openTime;
    }

    public void setOpenTime(String openTime) {
        this.openTime = openTime;
    }

    public String getCloseTime() {
        return closeTime;
    }

    public void setCloseTime(String closeTime) {
        this.closeTime = closeTime;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
