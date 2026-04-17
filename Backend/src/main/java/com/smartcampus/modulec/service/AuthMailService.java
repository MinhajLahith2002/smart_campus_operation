package com.smartcampus.modulec.service;

import com.smartcampus.modulec.domain.AuthUser;
import com.smartcampus.modulec.domain.TechnicianInvite;

public interface AuthMailService {

    default boolean isDeliveryEnabled() {
        return false;
    }

    void sendVerificationEmail(AuthUser user, String verificationLink);

    void sendPasswordResetEmail(AuthUser user, String resetLink);

    void sendTechnicianInviteEmail(TechnicianInvite invite, String inviteLink);
}
