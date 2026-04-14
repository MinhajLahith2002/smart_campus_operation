package com.smartcampus.operationshub.auth.dto;

public record DemoUserResponse(
        String id,
        String name,
        String email,
        String campusId,
        String role,
        String title
) {
}
