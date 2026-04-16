package com.smartcampus.modulec.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 140) String fullName,
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Size(min = 8, max = 120) String password,
        @NotBlank @Size(min = 8, max = 120) String confirmPassword,
        @NotBlank @Size(max = 32) String studentId,
        @NotBlank @Size(max = 64) String faculty,
        @NotBlank @Size(max = 4) String batch,
        @NotBlank @Size(max = 32) String campus,
        @NotBlank @Size(max = 20) String phone,
        @NotNull Boolean acceptedTerms
) {
}
