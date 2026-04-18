package com.smartcampus.operationshub.auth.controller;

import com.smartcampus.operationshub.auth.dto.DemoLoginRequest;
import com.smartcampus.operationshub.auth.dto.DemoUserResponse;
import com.smartcampus.operationshub.auth.service.DemoAuthService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class DemoAuthController {

    private final DemoAuthService demoAuthService;

    public DemoAuthController(DemoAuthService demoAuthService) {
        this.demoAuthService = demoAuthService;
    }

    @GetMapping("/demo-users")
    public List<DemoUserResponse> getDemoUsers() {
        return demoAuthService.getDemoUsers();
    }

    @PostMapping("/demo-login")
    public DemoUserResponse login(@Valid @RequestBody DemoLoginRequest request) {
        return demoAuthService.login(request);
    }
}
