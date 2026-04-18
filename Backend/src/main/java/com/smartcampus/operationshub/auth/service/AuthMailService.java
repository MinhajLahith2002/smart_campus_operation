package com.smartcampus.operationshub.auth.service;

import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.TechnicianInvite;

public interface AuthMailService {

    default boolean isDeliveryEnabled() {
        return false;
    }

    void sendVerificationEmail(AuthUser user, String verificationLink);

    void sendPasswordResetEmail(AuthUser user, String resetLink);

    void sendUserInviteEmail(TechnicianInvite invite, String inviteLink);
}
