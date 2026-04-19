package com.smartcampus.operationshub.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 140) String fullName,
        @Size(max = 64) String faculty,
        @Size(max = 32) String campus,
        @Size(max = 20) String phone
) {
}
