package com.smartcampus.modulec.dto;

public record AuthConfigResponse(
        boolean googleEnabled,
        int forgotPasswordCooldownSeconds
) {
}
