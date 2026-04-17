package com.smartcampus.operationshub.auth.service;

import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.TechnicianInvite;

public interface AuthMailService {

    void sendVerificationEmail(AuthUser user, String verificationLink);

    void sendPasswordResetEmail(AuthUser user, String resetLink);

    void sendTechnicianInviteEmail(TechnicianInvite invite, String inviteLink);
}
