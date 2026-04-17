package com.smartcampus.modulec.service;

import com.smartcampus.modulec.config.AuthProperties;
import com.smartcampus.modulec.controller.ApiRateLimitException;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthThrottleService {

    private final AuthProperties authProperties;
    private final Map<String, OffsetDateTime> forgotPasswordEmailThrottle = new ConcurrentHashMap<>();
    private final Map<String, OffsetDateTime> forgotPasswordClientThrottle = new ConcurrentHashMap<>();

    public AuthThrottleService(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    public void assertForgotPasswordAllowed(String email, String clientAddress) {
        long cooldownSeconds = Math.max(1, authProperties.getForgotPasswordCooldownSeconds());
        OffsetDateTime now = OffsetDateTime.now();

        long retryAfterSeconds = Math.max(
                getRetryAfterSeconds(forgotPasswordEmailThrottle, "forgot-email:" + normalizeKey(email), now),
                getRetryAfterSeconds(forgotPasswordClientThrottle, "forgot-client:" + normalizeKey(clientAddress), now)
        );

        if (retryAfterSeconds > 0) {
            throw new ApiRateLimitException(
                    "Please wait " + retryAfterSeconds + " seconds before requesting another reset link.",
                    retryAfterSeconds
            );
        }

        OffsetDateTime nextAllowedAt = now.plusSeconds(cooldownSeconds);
        forgotPasswordEmailThrottle.put("forgot-email:" + normalizeKey(email), nextAllowedAt);
        forgotPasswordClientThrottle.put("forgot-client:" + normalizeKey(clientAddress), nextAllowedAt);
    }

    public void clearAll() {
        forgotPasswordEmailThrottle.clear();
        forgotPasswordClientThrottle.clear();
    }

    private long getRetryAfterSeconds(Map<String, OffsetDateTime> store, String key, OffsetDateTime now) {
        OffsetDateTime nextAllowedAt = store.get(key);
        if (nextAllowedAt == null) {
            return 0;
        }
        if (!nextAllowedAt.isAfter(now)) {
            store.remove(key, nextAllowedAt);
            return 0;
        }
        return Math.max(1, java.time.Duration.between(now, nextAllowedAt).getSeconds());
    }

    private String normalizeKey(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase() : "anonymous";
    }
}
