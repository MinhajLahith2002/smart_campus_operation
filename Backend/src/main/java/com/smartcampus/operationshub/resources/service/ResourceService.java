package com.smartcampus.operationshub.resources.service;

import com.smartcampus.operationshub.resources.domain.ResourceAsset;
import com.smartcampus.operationshub.resources.domain.ResourceStatus;
import com.smartcampus.operationshub.resources.domain.ResourceType;
import com.smartcampus.operationshub.resources.dto.ResourceResponse;
import com.smartcampus.operationshub.resources.dto.ResourceSummaryResponse;
import com.smartcampus.operationshub.resources.repository.ResourceAssetRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ResourceService {

    private final ResourceAssetRepository resourceAssetRepository;

    public ResourceService(ResourceAssetRepository resourceAssetRepository) {
        this.resourceAssetRepository = resourceAssetRepository;
    }

    public List<ResourceResponse> getResources(String type) {
        List<ResourceAsset> resources = type == null || type.isBlank() || "ALL".equalsIgnoreCase(type)
                ? resourceAssetRepository.findAll()
                : resourceAssetRepository.findByType(ResourceType.valueOf(type.toUpperCase()));
        return resources.stream().map(this::map).toList();
    }

    public ResourceResponse getResource(Long resourceId) {
        return map(resourceAssetRepository.findById(resourceId)
                .orElseThrow(() -> new EntityNotFoundException("Resource " + resourceId + " was not found.")));
    }

    public ResourceSummaryResponse getSummary() {
        long total = resourceAssetRepository.count();
        long active = resourceAssetRepository.countByStatus(ResourceStatus.ACTIVE);
        long outOfService = resourceAssetRepository.countByStatus(ResourceStatus.OUT_OF_SERVICE);
        return new ResourceSummaryResponse(total, active, outOfService, active);
    }

    private ResourceResponse map(ResourceAsset resource) {
        return new ResourceResponse(
                resource.getId(),
                resource.getCode(),
                resource.getName(),
                resource.getType(),
                resource.getCapacity(),
                resource.getLocation(),
                resource.getDescription(),
                resource.getStatus(),
                resource.getAvailableFrom(),
                resource.getAvailableTo(),
                resource.getImageUrl(),
                resource.getHealthScore(),
                resource.getStatus() == ResourceStatus.ACTIVE
        );
    }
}
