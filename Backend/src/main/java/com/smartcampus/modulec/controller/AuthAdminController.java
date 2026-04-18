package com.smartcampus.modulec.controller;

import com.smartcampus.modulec.domain.AccountStatus;
import com.smartcampus.modulec.domain.AuthProviderType;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.dto.AuthUserResponse;
import com.smartcampus.modulec.dto.CreateUserInviteRequest;
import com.smartcampus.modulec.dto.UpdateUserStatusRequest;
import com.smartcampus.modulec.dto.UserInviteResponse;
import com.smartcampus.modulec.security.AuthUserPrincipal;
import com.smartcampus.modulec.service.AuthAdminService;
import com.smartcampus.modulec.service.AuthService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/admin")
public class AuthAdminController {

    private final AuthAdminService authAdminService;
    private final AuthService authService;

    public AuthAdminController(AuthAdminService authAdminService, AuthService authService) {
        this.authAdminService = authAdminService;
        this.authService = authService;
    }

    @GetMapping("/users")
    public List<AuthUserResponse> getUsers(@RequestParam(required = false) String query,
                                           @RequestParam(required = false) UserRole role,
                                           @RequestParam(required = false) AccountStatus status,
                                           @RequestParam(required = false) AuthProviderType provider) {
        return authAdminService.getUsers(query, role, status, provider, authService);
    }

    @PatchMapping("/users/{userId}/status")
    public AuthUserResponse updateUserStatus(@PathVariable String userId,
                                             @Valid @RequestBody UpdateUserStatusRequest request,
                                             @AuthenticationPrincipal AuthUserPrincipal principal) {
        return authAdminService.updateUserStatus(userId, request, principal, authService);
    }

    @PostMapping("/invites")
    public UserInviteResponse createInvite(@Valid @RequestBody CreateUserInviteRequest request,
                                           @AuthenticationPrincipal AuthUserPrincipal principal) {
        return authAdminService.createInvite(request, principal);
    }

    @GetMapping("/invites")
    public List<UserInviteResponse> getInvites() {
        return authAdminService.getInvites();
    }

    @PostMapping("/invites/{inviteId}/resend")
    public UserInviteResponse resendInvite(@PathVariable Long inviteId) {
        return authAdminService.resendInvite(inviteId);
    }

    @PostMapping("/invites/{inviteId}/revoke")
    public UserInviteResponse revokeInvite(@PathVariable Long inviteId) {
        return authAdminService.revokeInvite(inviteId);
    }
}
