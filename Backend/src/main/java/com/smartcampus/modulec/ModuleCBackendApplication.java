package com.smartcampus.modulec;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.smartcampus")
@EntityScan(basePackages = "com.smartcampus")
@EnableJpaRepositories(basePackages = "com.smartcampus")
public class ModuleCBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ModuleCBackendApplication.class, args);
    }
}