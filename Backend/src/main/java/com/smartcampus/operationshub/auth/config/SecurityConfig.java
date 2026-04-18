package com.smartcampus.operationshub.auth.config;

import com.smartcampus.operationshub.auth.security.GoogleOAuth2FailureHandler;
import com.smartcampus.operationshub.auth.security.GoogleOAuth2SuccessHandler;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfig {

    @Value("${AUTH_GOOGLE_CLIENT_ID:}")
    private String googleClientId;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            GoogleOAuth2SuccessHandler successHandler,
                                            GoogleOAuth2FailureHandler failureHandler,
                                            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/config",
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/google/onboarding",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/auth/verify-email",
                                "/api/auth/invitations/*",
                                "/api/auth/invitations/accept",
                                "/oauth2/**",
                                "/login/oauth2/**",
                                "/error"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/invitations/*").permitAll()
                        .requestMatchers("/api/auth/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/module-c/**", "/api/auth/me", "/api/auth/logout").authenticated()
                        .anyRequest().permitAll()
                )
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler((request, response, authentication) -> response.setStatus(HttpStatus.NO_CONTENT.value()))
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("""
                                    {"timestamp":"%s","status":401,"message":"Unauthorized"}
                                    """.formatted(OffsetDateTime.now()));
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("""
                                    {"timestamp":"%s","status":403,"message":"Forbidden"}
                                    """.formatted(OffsetDateTime.now()));
                        })
                );

        if (StringUtils.hasText(googleClientId) && clientRegistrationRepositoryProvider.getIfAvailable() != null) {
            http.oauth2Login(oauth -> oauth.successHandler(successHandler).failureHandler(failureHandler));
        }

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AuthProperties authProperties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowCredentials(true);
        configuration.setAllowedOriginPatterns(Stream.of(
                        normalizeOrigin(authProperties.getFrontendBaseUrl()),
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "https://localhost:*",
                        "https://127.0.0.1:*"
                )
                .filter(StringUtils::hasText)
                .distinct()
                .toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Location"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    @ConditionalOnExpression("#{T(org.springframework.util.StringUtils).hasText('${AUTH_GOOGLE_CLIENT_ID:}') and T(org.springframework.util.StringUtils).hasText('${AUTH_GOOGLE_CLIENT_SECRET:}')}")
    ClientRegistrationRepository clientRegistrationRepository(@Value("${AUTH_GOOGLE_CLIENT_ID}") String clientId,
                                                              @Value("${AUTH_GOOGLE_CLIENT_SECRET}") String clientSecret,
                                                              @Value("${AUTH_GOOGLE_SCOPE:openid,profile,email}") String scope) {
        ClientRegistration registration = CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .scope(Arrays.stream(scope.split(","))
                        .map(String::trim)
                        .filter(StringUtils::hasText)
                        .toList())
                .build();
        return new InMemoryClientRegistrationRepository(registration);
    }

    @Bean
    @ConditionalOnExpression("#{T(org.springframework.util.StringUtils).hasText('${AUTH_GOOGLE_CLIENT_ID:}') and T(org.springframework.util.StringUtils).hasText('${AUTH_GOOGLE_CLIENT_SECRET:}')}")
    OAuth2AuthorizedClientService authorizedClientService(ClientRegistrationRepository clientRegistrationRepository) {
        return new InMemoryOAuth2AuthorizedClientService(clientRegistrationRepository);
    }

    private String normalizeOrigin(String origin) {
        if (!StringUtils.hasText(origin)) {
            return null;
        }
        return origin.replaceAll("/+$", "");
    }
}
