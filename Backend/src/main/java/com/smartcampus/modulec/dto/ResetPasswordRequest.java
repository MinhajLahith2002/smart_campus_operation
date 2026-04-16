package com.smartcampus.modulec.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Size(max = 255) String token,
        @NotBlank @Size(min = 8, max = 120) String password,
        @NotBlank @Size(min = 8, max = 120) String confirmPassword
) {
}
