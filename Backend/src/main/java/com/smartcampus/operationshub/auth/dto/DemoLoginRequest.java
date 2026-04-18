package com.smartcampus.operationshub.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record DemoLoginRequest(
        @NotBlank @Email String email,
        @NotBlank String campusId,
        @NotBlank String password,
        @NotBlank String role
) {
}
