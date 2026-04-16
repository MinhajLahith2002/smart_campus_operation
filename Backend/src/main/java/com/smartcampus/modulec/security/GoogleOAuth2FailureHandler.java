package com.smartcampus.modulec.security;

import com.smartcampus.modulec.config.AuthProperties;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

@Component
public class GoogleOAuth2FailureHandler implements AuthenticationFailureHandler {

    private final AuthProperties authProperties;

    public GoogleOAuth2FailureHandler(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException, ServletException {
        String message = URLEncoder.encode(exception.getMessage(), StandardCharsets.UTF_8);
        response.sendRedirect(authProperties.getFrontendBaseUrl() + authProperties.getOauthFailurePath() + "?oauthError=" + message);
    }
}
