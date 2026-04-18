package com.smartcampus.operationshub.resources.repository;

import com.smartcampus.operationshub.resources.domain.ResourceAsset;
import com.smartcampus.operationshub.resources.domain.ResourceStatus;
import com.smartcampus.operationshub.resources.domain.ResourceType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceAssetRepository extends JpaRepository<ResourceAsset, Long> {
    List<ResourceAsset> findByType(ResourceType type);
    long countByStatus(ResourceStatus status);
}
