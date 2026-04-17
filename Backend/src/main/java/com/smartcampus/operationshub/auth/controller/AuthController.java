package com.smartcampus.operationshub.auth.controller;

import com.smartcampus.operationshub.auth.dto.AuthConfigResponse;
import com.smartcampus.operationshub.auth.dto.AuthMessageResponse;
import com.smartcampus.operationshub.auth.dto.AuthResponse;
import com.smartcampus.operationshub.auth.dto.ForgotPasswordRequest;
import com.smartcampus.operationshub.auth.dto.GoogleOnboardingRequest;
import com.smartcampus.operationshub.auth.dto.GoogleOnboardingResponse;
import com.smartcampus.operationshub.auth.dto.InviteAcceptanceRequest;
import com.smartcampus.operationshub.auth.dto.InviteDetailsResponse;
import com.smartcampus.operationshub.auth.dto.LoginRequest;
import com.smartcampus.operationshub.auth.dto.RegisterRequest;
import com.smartcampus.operationshub.auth.dto.ResetPasswordRequest;
import com.smartcampus.operationshub.auth.security.AuthUserPrincipal;
import com.smartcampus.operationshub.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final Environment environment;

    public AuthController(AuthService authService, Environment environment) {
        this.authService = authService;
        this.environment = environment;
    }

    @GetMapping("/config")
    public AuthConfigResponse getConfig() {
        String googleClientId = firstProperty(
                "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID",
                "GOOGLE_CLIENT_ID",
                "spring.security.oauth2.client.registration.google.client-id"
        );
        String googleClientSecret = firstProperty(
                "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET",
                "GOOGLE_CLIENT_SECRET",
                "spring.security.oauth2.client.registration.google.client-secret"
        );
        return new AuthConfigResponse(StringUtils.hasText(googleClientId) && StringUtils.hasText(googleClientSecret));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request,
                              HttpServletRequest httpRequest,
                              HttpServletResponse httpResponse) {
        return authService.login(request, httpRequest, httpResponse);
    }

    @GetMapping("/me")
    public AuthResponse me(@AuthenticationPrincipal AuthUserPrincipal principal) {
        return new AuthResponse(authService.toResponse(authService.requireUser(principal.getPublicId())));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/forgot-password")
    public AuthMessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return new AuthMessageResponse("If an account exists for that email, a password reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public AuthMessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return new AuthMessageResponse("Your password has been updated.");
    }

    @GetMapping("/verify-email")
    public AuthMessageResponse verifyEmail(@RequestParam("token") String token) {
        authService.verifyEmail(token);
        return new AuthMessageResponse("Your email address has been verified.");
    }

    @GetMapping("/google/onboarding")
    public GoogleOnboardingResponse getGoogleOnboarding(HttpServletRequest request) {
        return authService.getGoogleOnboarding(request);
    }

    @PostMapping("/google/onboarding")
    public AuthResponse completeGoogleOnboarding(@Valid @RequestBody GoogleOnboardingRequest request,
                                                 HttpServletRequest httpRequest,
                                                 HttpServletResponse httpResponse) {
        return authService.completeGoogleOnboarding(request, httpRequest, httpResponse);
    }

    @GetMapping("/invitations/{token}")
    public InviteDetailsResponse getInviteDetails(@PathVariable String token) {
        return authService.getInviteDetails(token);
    }

    @PostMapping("/invitations/accept")
    public AuthResponse acceptInvite(@Valid @RequestBody InviteAcceptanceRequest request,
                                     HttpServletRequest httpRequest,
                                     HttpServletResponse httpResponse) {
        return authService.acceptTechnicianInvite(request, httpRequest, httpResponse);
    }

    private String firstProperty(String... keys) {
        for (String key : keys) {
            String value = environment.getProperty(key);
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
