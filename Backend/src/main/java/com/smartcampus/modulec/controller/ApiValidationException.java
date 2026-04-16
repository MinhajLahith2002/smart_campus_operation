package com.smartcampus.modulec.controller;

import java.util.Map;

public class ApiValidationException extends RuntimeException {

    private final Map<String, String> fields;

    public ApiValidationException(String message, Map<String, String> fields) {
        super(message);
        this.fields = fields;
    }

    public Map<String, String> getFields() {
        return fields;
    }
}
