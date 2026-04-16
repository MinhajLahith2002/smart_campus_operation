package com.smartcampus.modulec.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTechnicianInviteRequest(
        @NotBlank @Size(max = 140) String fullName,
        @NotBlank @Email @Size(max = 160) String email
) {
}
