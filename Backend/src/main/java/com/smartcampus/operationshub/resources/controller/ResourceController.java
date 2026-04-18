package com.smartcampus.operationshub.resources.controller;

import com.smartcampus.operationshub.resources.dto.ResourceResponse;
import com.smartcampus.operationshub.resources.dto.ResourceSummaryResponse;
import com.smartcampus.operationshub.resources.service.ResourceService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping
    public List<ResourceResponse> getResources(@RequestParam(required = false) String type) {
        return resourceService.getResources(type);
    }

    @GetMapping("/{resourceId}")
    public ResourceResponse getResource(@PathVariable Long resourceId) {
        return resourceService.getResource(resourceId);
    }

    @GetMapping("/summary")
    public ResourceSummaryResponse getSummary() {
        return resourceService.getSummary();
    }
}
