package com.smartcampus.operationshub.auth.security;

import com.smartcampus.operationshub.config.AuthProperties;
import com.smartcampus.operationshub.auth.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final AuthProperties authProperties;

    public GoogleOAuth2SuccessHandler(AuthService authService, AuthProperties authProperties) {
        this.authService = authService;
        this.authProperties = authProperties;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String googleId = String.valueOf(oauthUser.getAttributes().get("sub"));
        String email = String.valueOf(oauthUser.getAttributes().get("email"));
        String name = String.valueOf(oauthUser.getAttributes().get("name"));
        boolean emailVerified = Boolean.TRUE.equals(oauthUser.getAttributes().get("email_verified"));

        AuthService.GoogleAuthenticationResult result = authService.handleGoogleLogin(googleId, email, name, emailVerified);
        if (result.onboardingRequired()) {
            new SecurityContextLogoutHandler().logout(request, response, authentication);
            HttpSession session = request.getSession(true);
            session.setAttribute(AuthService.GOOGLE_ONBOARDING_SESSION_KEY, result.onboardingState());
            response.sendRedirect(authProperties.getFrontendBaseUrl() + "/register?mode=google");
            return;
        }

        authService.establishSession(result.user(), request, response);
        response.sendRedirect(authProperties.getFrontendBaseUrl() + authProperties.getOauthSuccessPath());
    }
}
