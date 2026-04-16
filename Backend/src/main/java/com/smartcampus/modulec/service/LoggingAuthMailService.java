package com.smartcampus.modulec.service;

import com.smartcampus.modulec.domain.AuthUser;
import com.smartcampus.modulec.domain.TechnicianInvite;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LoggingAuthMailService implements AuthMailService {

    private static final Logger logger = LoggerFactory.getLogger(LoggingAuthMailService.class);

    @Override
    public void sendVerificationEmail(AuthUser user, String verificationLink) {
        logger.info("Verification email prepared for {}. Configure SMTP to deliver auth emails.", user.getEmail());
    }

    @Override
    public void sendPasswordResetEmail(AuthUser user, String resetLink) {
        logger.info("Password reset email prepared for {}. Configure SMTP to deliver auth emails.", user.getEmail());
    }

    @Override
    public void sendTechnicianInviteEmail(TechnicianInvite invite, String inviteLink) {
        logger.info("Technician invite email prepared for {}. Configure SMTP to deliver auth emails.", invite.getEmail());
    }
}
