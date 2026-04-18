package com.smartcampus.operationshub.config;

import com.smartcampus.operationshub.auth.config.AuthProperties;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthProperties authProperties;

    public WebConfig(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        Set<String> allowedOrigins = new LinkedHashSet<>();
        allowedOrigins.add("http://localhost:3000");
        allowedOrigins.add("http://127.0.0.1:3000");
        allowedOrigins.add("http://localhost:5173");
        allowedOrigins.add(authProperties.getFrontendBaseUrl());

        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
