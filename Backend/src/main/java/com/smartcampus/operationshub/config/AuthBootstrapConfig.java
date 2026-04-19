package com.smartcampus.operationshub.config;

import com.smartcampus.operationshub.auth.repository.AuthUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AuthBootstrapConfig {

    @Bean
    public CommandLineRunner bootstrapAdmin(AuthProperties authProperties,
                                            AuthUserRepository authUserRepository,
                                            PasswordEncoder passwordEncoder) {
        return args -> AuthBootstrapSupport.syncConfiguredAccounts(authProperties, authUserRepository, passwordEncoder);
    }
}
