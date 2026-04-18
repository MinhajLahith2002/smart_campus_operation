package com.smartcampus.operationshub.auth.dto;

public record AuthResponse(
        AuthUserResponse user,
        boolean emailDeliveryEnabled,
        String verificationLinkPreview
) {
    public AuthResponse(AuthUserResponse user) {
        this(user, true, null);
    }
}
