package com.smartcampus.modulec.controller;

import com.smartcampus.modulec.dto.AuthConfigResponse;
import com.smartcampus.modulec.dto.AuthMessageResponse;
import com.smartcampus.modulec.dto.AuthResponse;
import com.smartcampus.modulec.dto.ForgotPasswordRequest;
import com.smartcampus.modulec.dto.GoogleOnboardingRequest;
import com.smartcampus.modulec.dto.GoogleOnboardingResponse;
import com.smartcampus.modulec.dto.InviteAcceptanceRequest;
import com.smartcampus.modulec.dto.InviteDetailsResponse;
import com.smartcampus.modulec.dto.LoginRequest;
import com.smartcampus.modulec.dto.RegisterRequest;
import com.smartcampus.modulec.dto.ResetPasswordRequest;
import com.smartcampus.modulec.security.AuthUserPrincipal;
import com.smartcampus.modulec.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientId;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/config")
    public AuthConfigResponse getConfig() {
        return new AuthConfigResponse(StringUtils.hasText(googleClientId));
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
}
