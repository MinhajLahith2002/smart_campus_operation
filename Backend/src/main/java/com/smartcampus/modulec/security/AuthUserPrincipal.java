package com.smartcampus.modulec.security;

import com.smartcampus.modulec.domain.AccountStatus;
import com.smartcampus.modulec.domain.AuthProviderType;
import com.smartcampus.modulec.domain.AuthUser;
import com.smartcampus.modulec.domain.UserRole;
import java.io.Serial;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AuthUserPrincipal implements UserDetails, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String publicId;
    private final String fullName;
    private final String email;
    private final String passwordHash;
    private final UserRole role;
    private final AccountStatus status;
    private final AuthProviderType authProviderType;
    private final boolean emailVerified;

    public AuthUserPrincipal(AuthUser user) {
        this.publicId = user.getPublicId();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole();
        this.status = user.getStatus();
        this.authProviderType = user.getAuthProviderType();
        this.emailVerified = user.isEmailVerified();
    }

    public String getPublicId() {
        return publicId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public UserRole getRole() {
        return role;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public AuthProviderType getAuthProviderType() {
        return authProviderType;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash == null ? "" : passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != AccountStatus.DISABLED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status != AccountStatus.DISABLED;
    }
}
