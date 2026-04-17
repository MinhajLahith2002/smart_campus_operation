package com.smartcampus.modulec.repository;

import com.smartcampus.modulec.domain.FacilityAsset;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface FacilityAssetRepository extends JpaRepository<FacilityAsset, Long>, JpaSpecificationExecutor<FacilityAsset> {
    Optional<FacilityAsset> findByNameIgnoreCaseAndLocationIgnoreCase(String name, String location);
}
