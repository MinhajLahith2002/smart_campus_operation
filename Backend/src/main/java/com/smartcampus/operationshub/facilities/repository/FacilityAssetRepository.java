package com.smartcampus.operationshub.facilities.repository;

import com.smartcampus.operationshub.facilities.domain.FacilityAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface FacilityAssetRepository extends JpaRepository<FacilityAsset, Long>, JpaSpecificationExecutor<FacilityAsset> {
}
