package com.smartcampus.modulec.controller;

import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.dto.FacilityAssetQuery;
import com.smartcampus.modulec.dto.FacilityAssetRequest;
import com.smartcampus.modulec.dto.FacilityAssetResponse;
import com.smartcampus.modulec.dto.UpdateFacilityAssetStatusRequest;
import com.smartcampus.modulec.service.FacilityAssetService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/module-a/resources")
public class FacilityAssetController {

    private final FacilityAssetService facilityAssetService;

    public FacilityAssetController(FacilityAssetService facilityAssetService) {
        this.facilityAssetService = facilityAssetService;
    }

    @GetMapping
    public List<FacilityAssetResponse> getResources(@Valid FacilityAssetQuery query) {
        return facilityAssetService.getResources(query);
    }

    @GetMapping("/{resourceId}")
    public FacilityAssetResponse getResource(@PathVariable Long resourceId) {
        return facilityAssetService.getResource(resourceId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FacilityAssetResponse createResource(
            @Valid @RequestBody FacilityAssetRequest request,
            @RequestHeader("X-Actor-Role") UserRole actorRole
    ) {
        return facilityAssetService.createResource(request, actorRole);
    }

    @PutMapping("/{resourceId}")
    public FacilityAssetResponse updateResource(
            @PathVariable Long resourceId,
            @Valid @RequestBody FacilityAssetRequest request,
            @RequestHeader("X-Actor-Role") UserRole actorRole
    ) {
        return facilityAssetService.updateResource(resourceId, request, actorRole);
    }

    @PatchMapping("/{resourceId}/status")
    public FacilityAssetResponse updateStatus(
            @PathVariable Long resourceId,
            @Valid @RequestBody UpdateFacilityAssetStatusRequest request,
            @RequestHeader("X-Actor-Role") UserRole actorRole
    ) {
        return facilityAssetService.updateResourceStatus(resourceId, request, actorRole);
    }

    @DeleteMapping("/{resourceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteResource(
            @PathVariable Long resourceId,
            @RequestHeader("X-Actor-Role") UserRole actorRole
    ) {
        facilityAssetService.deleteResource(resourceId, actorRole);
    }
}
