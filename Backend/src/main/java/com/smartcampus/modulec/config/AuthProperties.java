package com.smartcampus.modulec.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {

    private String frontendBaseUrl = "http://localhost:3000";
    private String oauthSuccessPath = "/auth/oauth-success";
    private String oauthFailurePath = "/auth";
    private long resetTokenHours = 2;
    private long verificationTokenHours = 24;
    private long inviteTokenHours = 72;
    private final BootstrapAdmin bootstrapAdmin = new BootstrapAdmin();
    private final SampleUsers sampleUsers = new SampleUsers();

    public String getFrontendBaseUrl() {
        return frontendBaseUrl;
    }

    public void setFrontendBaseUrl(String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public String getOauthSuccessPath() {
        return oauthSuccessPath;
    }

    public void setOauthSuccessPath(String oauthSuccessPath) {
        this.oauthSuccessPath = oauthSuccessPath;
    }

    public String getOauthFailurePath() {
        return oauthFailurePath;
    }

    public void setOauthFailurePath(String oauthFailurePath) {
        this.oauthFailurePath = oauthFailurePath;
    }

    public long getResetTokenHours() {
        return resetTokenHours;
    }

    public void setResetTokenHours(long resetTokenHours) {
        this.resetTokenHours = resetTokenHours;
    }

    public long getVerificationTokenHours() {
        return verificationTokenHours;
    }

    public void setVerificationTokenHours(long verificationTokenHours) {
        this.verificationTokenHours = verificationTokenHours;
    }

    public long getInviteTokenHours() {
        return inviteTokenHours;
    }

    public void setInviteTokenHours(long inviteTokenHours) {
        this.inviteTokenHours = inviteTokenHours;
    }

    public BootstrapAdmin getBootstrapAdmin() {
        return bootstrapAdmin;
    }

    public SampleUsers getSampleUsers() {
        return sampleUsers;
    }

    public static class BootstrapAdmin {
        private String email;
        private String password;
        private String fullName = "Campus Operations Admin";

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }
    }

    public static class SampleUsers {
        private boolean enabled;
        private final SampleStudent student = new SampleStudent();
        private final SampleAccount technician = new SampleAccount();

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public SampleStudent getStudent() {
            return student;
        }

        public SampleAccount getTechnician() {
            return technician;
        }
    }

    public static class SampleAccount {
        private String email;
        private String password;
        private String fullName;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }
    }

    public static class SampleStudent extends SampleAccount {
        private String studentId = "IT20240001";
        private String faculty = "IT";
        private String batch = "2024";
        private String campus = "malabe";
        private String phone = "+94 712345678";

        public String getStudentId() {
            return studentId;
        }

        public void setStudentId(String studentId) {
            this.studentId = studentId;
        }

        public String getFaculty() {
            return faculty;
        }

        public void setFaculty(String faculty) {
            this.faculty = faculty;
        }

        public String getBatch() {
            return batch;
        }

        public void setBatch(String batch) {
            this.batch = batch;
        }

        public String getCampus() {
            return campus;
        }

        public void setCampus(String campus) {
            this.campus = campus;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }
    }
}
