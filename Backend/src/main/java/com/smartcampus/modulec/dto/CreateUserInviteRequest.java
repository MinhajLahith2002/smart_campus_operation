package com.smartcampus.modulec.dto;

import com.smartcampus.modulec.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateUserInviteRequest(
        @NotBlank @Size(max = 140) String fullName,
        @NotBlank @Email @Size(max = 160) String email,
        @NotNull UserRole role
) {
}
