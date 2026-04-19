package com.smartcampus.operationshub.auth.security;

import com.smartcampus.operationshub.auth.domain.AccountStatus;
import com.smartcampus.operationshub.auth.domain.AuthUser;
import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.time.OffsetDateTime;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SessionAccountStateFilter extends OncePerRequestFilter {

    private final AuthUserRepository authUserRepository;

    public SessionAccountStateFilter(AuthUserRepository authUserRepository) {
        this.authUserRepository = authUserRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/auth/admin/")
                && !"/api/auth/me".equals(path)
                && !path.startsWith("/api/module-c/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserPrincipal principal)) {
            filterChain.doFilter(request, response);
            return;
        }

        AuthUser user = authUserRepository.findByPublicId(principal.getPublicId()).orElse(null);
        if (!isSessionAllowed(user)) {
            clearSession(request);
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                    {"timestamp":"%s","status":401,"message":"This account is currently disabled."}
                    """.formatted(OffsetDateTime.now()));
            return;
        }

        AuthUserPrincipal refreshedPrincipal = new AuthUserPrincipal(user);
        UsernamePasswordAuthenticationToken refreshedAuthentication = new UsernamePasswordAuthenticationToken(
                refreshedPrincipal,
                authentication.getCredentials(),
                refreshedPrincipal.getAuthorities()
        );
        refreshedAuthentication.setDetails(authentication.getDetails());
        SecurityContextHolder.getContext().setAuthentication(refreshedAuthentication);
        filterChain.doFilter(request, response);
    }

    private boolean isSessionAllowed(AuthUser user) {
        if (user == null) {
            return false;
        }
        if (user.getStatus() == AccountStatus.DISABLED || user.getStatus() == AccountStatus.INVITED) {
            return false;
        }
        return user.getStatus() != AccountStatus.PENDING_VERIFICATION || user.isEmailVerified();
    }

    private void clearSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }
}
