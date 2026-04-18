package com.smartcampus.operationshub.auth.service;

import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.domain.TechnicianInvite;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LoggingAuthMailService implements AuthMailService {

    private static final Logger logger = LoggerFactory.getLogger(LoggingAuthMailService.class);

    @Override
    public void sendVerificationEmail(AuthUser user, String verificationLink) {
        logger.info("Verification email prepared for {}. Configure SMTP to deliver auth emails.", user.getEmail());
        logger.info("Development verification link for {} -> {}", user.getEmail(), verificationLink);
    }

    @Override
    public void sendPasswordResetEmail(AuthUser user, String resetLink) {
        logger.info("Password reset email prepared for {}. Configure SMTP to deliver auth emails.", user.getEmail());
        logger.info("Development password reset link for {} -> {}", user.getEmail(), resetLink);
    }

    @Override
    public void sendUserInviteEmail(TechnicianInvite invite, String inviteLink) {
        logger.info("{} invite email prepared for {}. Configure SMTP to deliver auth emails.", invite.getInvitedRole(), invite.getEmail());
        logger.info("Development {} invite link for {} -> {}", invite.getInvitedRole(), invite.getEmail(), inviteLink);
    }
}
