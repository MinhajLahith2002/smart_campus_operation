package com.smartcampus.operationshub.auth.service;

import com.smartcampus.operationshub.auth.dto.DemoLoginRequest;
import com.smartcampus.operationshub.auth.dto.DemoUserResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DemoAuthService {

    private final List<DemoAccount> accounts = List.of(
            new DemoAccount("student-01", "Amaya Perera", "student@campus.edu", "ST2026001", "USER", "Student / Staff", "Student@123", "0771234567", true),
            new DemoAccount("admin-1", "Operations Admin", "admin@campus.edu", "AD2026001", "ADMIN", "Operations Admin", "Admin@123", "0112345678", true),
            new DemoAccount("tech-17", "Kasun Silva", "tech@campus.edu", "TE2026001", "TECHNICIAN", "Technician", "Tech@123", "0710856475", true),
            new DemoAccount("tech-21", "Nuwan Silva", "tech2@campus.edu", "TE2026002", "TECHNICIAN", "Technician", "Tech2@123", "0710856401", false),
            new DemoAccount("tech-31", "Dilmi Fernando", "tech3@campus.edu", "TE2026003", "TECHNICIAN", "Technician", "Tech3@123", "0710856402", true)
    );

    public List<DemoUserResponse> getDemoUsers() {
        return accounts.stream().map(DemoAccount::toResponse).toList();
    }

    public DemoUserResponse login(DemoLoginRequest request) {
        return accounts.stream()
                .filter(account -> account.role().equalsIgnoreCase(request.role().trim()))
                .filter(account -> account.email().equalsIgnoreCase(request.email().trim()))
                .filter(account -> account.campusId().equalsIgnoreCase(request.campusId().trim()))
                .filter(account -> account.password().equals(request.password()))
                .findFirst()
                .map(DemoAccount::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Use the correct role email, campus ID, and password for the selected role."));
    }

    private record DemoAccount(String id, String name, String email, String campusId, String role, String title, String password, String phone, boolean available) {
        private DemoUserResponse toResponse() {
            return new DemoUserResponse(id, name, email, campusId, role, title, phone, available);
        }
    }
}
