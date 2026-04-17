package com.smartcampus.modulec.service;

import com.smartcampus.modulec.config.AuthProperties;
import com.smartcampus.modulec.domain.AuthUser;
import com.smartcampus.modulec.domain.TechnicianInvite;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Primary
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${spring.mail.host:}') and T(org.springframework.util.StringUtils).hasText('${app.auth.mail.from-address:}')")
public class SmtpAuthMailService implements AuthMailService {

    private final JavaMailSender mailSender;
    private final AuthProperties authProperties;

    public SmtpAuthMailService(JavaMailSender mailSender, AuthProperties authProperties) {
        this.mailSender = mailSender;
        this.authProperties = authProperties;
    }

    @Override
    public boolean isDeliveryEnabled() {
        return true;
    }

    @Override
    public void sendVerificationEmail(AuthUser user, String verificationLink) {
        sendEmail(
                user.getEmail(),
                "Verify your CampusHub email",
                """
                Hello %s,

                Welcome to CampusHub. Please verify your email address using the link below:

                %s

                If you did not create this account, you can safely ignore this email.
                """.formatted(user.getFullName(), verificationLink)
        );
    }

    @Override
    public void sendPasswordResetEmail(AuthUser user, String resetLink) {
        sendEmail(
                user.getEmail(),
                "Reset your CampusHub password",
                """
                Hello %s,

                We received a request to reset your CampusHub password. Use the link below to continue:

                %s

                If you did not request this, you can safely ignore this email.
                """.formatted(user.getFullName(), resetLink)
        );
    }

    @Override
    public void sendTechnicianInviteEmail(TechnicianInvite invite, String inviteLink) {
        sendEmail(
                invite.getEmail(),
                "Complete your CampusHub technician account setup",
                """
                Hello %s,

                You have been invited to join CampusHub as a technician. Complete your account setup with the link below:

                %s

                If you were not expecting this invite, you can safely ignore this email.
                """.formatted(invite.getFullName(), inviteLink)
        );
    }

    private void sendEmail(String recipient, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(recipient);
            helper.setFrom(authProperties.getMail().getFromAddress(), authProperties.getMail().getFromName());
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException exception) {
            throw new IllegalStateException("Unable to prepare auth email for delivery.", exception);
        }
    }
}
