package com.smartcampus.modulec.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AvailabilityWindowRequest(
        @NotEmpty List<@NotBlank @Size(max = 20) String> daysOfWeek,
        @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):([0-5]\\d)$", message = "Opening time must use HH:mm format") String openTime,
        @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):([0-5]\\d)$", message = "Closing time must use HH:mm format") String closeTime,
        @Size(max = 300) String notes
) {
}
