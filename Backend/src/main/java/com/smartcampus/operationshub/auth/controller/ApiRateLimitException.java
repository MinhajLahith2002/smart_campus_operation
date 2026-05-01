package com.smartcampus.operationshub.auth.controller;

public class ApiRateLimitException extends RuntimeException {

    private final long retryAfterSeconds;

    public ApiRateLimitException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
