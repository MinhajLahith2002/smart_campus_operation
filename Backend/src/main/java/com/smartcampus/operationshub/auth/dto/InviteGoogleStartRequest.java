package com.smartcampus.operationshub.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InviteGoogleStartRequest(
        @NotBlank @Size(max = 255) String token
) {
}
