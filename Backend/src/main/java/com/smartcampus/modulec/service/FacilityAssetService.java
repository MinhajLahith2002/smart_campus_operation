package com.smartcampus.modulec.service;

import com.smartcampus.modulec.domain.AvailabilityWindow;
import com.smartcampus.modulec.domain.FacilityAsset;
import com.smartcampus.modulec.domain.ResourceStatus;
import com.smartcampus.modulec.domain.ResourceType;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.dto.AvailabilityWindowRequest;
import com.smartcampus.modulec.dto.AvailabilityWindowResponse;
import com.smartcampus.modulec.dto.FacilityAssetQuery;
import com.smartcampus.modulec.dto.FacilityAssetRequest;
import com.smartcampus.modulec.dto.FacilityAssetResponse;
import com.smartcampus.modulec.dto.UpdateFacilityAssetStatusRequest;
import com.smartcampus.modulec.repository.FacilityAssetRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FacilityAssetService {

    private final FacilityAssetRepository facilityAssetRepository;

    public FacilityAssetService(FacilityAssetRepository facilityAssetRepository) {
        this.facilityAssetRepository = facilityAssetRepository;
    }

    @Transactional(readOnly = true)
    public List<FacilityAssetResponse> getResources(FacilityAssetQuery query) {
        Specification<FacilityAsset> specification = Specification.where(byType(query.type()))
                .and(byStatus(query.status()))
                .and(byCapacity(query.capacity()))
                .and(byLocation(query.location()))
                .and(bySearch(query.search()));

        return facilityAssetRepository.findAll(specification, Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public FacilityAssetResponse getResource(Long resourceId) {
        return map(findResource(resourceId));
    }

    public FacilityAssetResponse createResource(FacilityAssetRequest request, UserRole actorRole) {
        ensureAdmin(actorRole);

        FacilityAsset resource = new FacilityAsset();
        apply(resource, request);
        OffsetDateTime now = OffsetDateTime.now();
        resource.setCreatedAt(now);
        resource.setUpdatedAt(now);

        return map(facilityAssetRepository.save(resource));
    }

    public FacilityAssetResponse updateResource(Long resourceId, FacilityAssetRequest request, UserRole actorRole) {
        ensureAdmin(actorRole);

        FacilityAsset resource = findResource(resourceId);
        apply(resource, request);
        resource.setUpdatedAt(OffsetDateTime.now());

        return map(facilityAssetRepository.save(resource));
    }

    public FacilityAssetResponse updateResourceStatus(Long resourceId, UpdateFacilityAssetStatusRequest request, UserRole actorRole) {
        ensureAdmin(actorRole);

        FacilityAsset resource = findResource(resourceId);
        resource.setStatus(request.status());
        resource.setUpdatedAt(OffsetDateTime.now());

        return map(facilityAssetRepository.save(resource));
    }

    public void deleteResource(Long resourceId, UserRole actorRole) {
        ensureAdmin(actorRole);
        facilityAssetRepository.delete(findResource(resourceId));
    }

    private FacilityAsset findResource(Long resourceId) {
        return facilityAssetRepository.findById(resourceId)
                .orElseThrow(() -> new EntityNotFoundException("Resource " + resourceId + " was not found."));
    }

    private void ensureAdmin(UserRole actorRole) {
        if (actorRole != UserRole.ADMIN) {
            throw new SecurityException("Only admins can modify facilities and assets.");
        }
    }

    private void apply(FacilityAsset resource, FacilityAssetRequest request) {
        validateAvailabilityWindow(request.availabilityWindow());

        resource.setName(request.name().trim());
        resource.setType(request.type());
        resource.setCapacity(request.capacity());
        resource.setLocation(request.location().trim());
        resource.setDescription(blankToNull(request.description()));
        resource.setImageUrl(blankToNull(request.imageUrl()));
        resource.setStatus(request.status());
        resource.setAvailabilityWindow(toAvailabilityWindow(request.availabilityWindow()));
    }

    private void validateAvailabilityWindow(AvailabilityWindowRequest availabilityWindow) {
        if (availabilityWindow.openTime().compareTo(availabilityWindow.closeTime()) >= 0) {
            throw new IllegalArgumentException("Closing time must be later than opening time.");
        }
    }

    private AvailabilityWindow toAvailabilityWindow(AvailabilityWindowRequest request) {
        AvailabilityWindow availabilityWindow = new AvailabilityWindow();
        availabilityWindow.setDaysOfWeek(String.join(",", request.daysOfWeek()));
        availabilityWindow.setOpenTime(request.openTime());
        availabilityWindow.setCloseTime(request.closeTime());
        availabilityWindow.setNotes(blankToNull(request.notes()));
        return availabilityWindow;
    }

    private FacilityAssetResponse map(FacilityAsset resource) {
        List<String> days = resource.getAvailabilityWindow() == null || resource.getAvailabilityWindow().getDaysOfWeek() == null
                ? List.of()
                : Arrays.stream(resource.getAvailabilityWindow().getDaysOfWeek().split(","))
                        .map(String::trim)
                        .filter(value -> !value.isBlank())
                        .toList();

        return new FacilityAssetResponse(
                resource.getId(),
                resource.getName(),
                resource.getType(),
                resource.getCapacity(),
                resource.getLocation(),
                resource.getDescription(),
                resource.getImageUrl(),
                new AvailabilityWindowResponse(
                        days,
                        resource.getAvailabilityWindow().getOpenTime(),
                        resource.getAvailabilityWindow().getCloseTime(),
                        resource.getAvailabilityWindow().getNotes()
                ),
                resource.getStatus(),
                resource.getStatus() == ResourceStatus.ACTIVE,
                resource.getCreatedAt(),
                resource.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Specification<FacilityAsset> byType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("type"), ResourceType.valueOf(type.trim().toUpperCase(Locale.ROOT)));
    }

    private Specification<FacilityAsset> byStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("status"), ResourceStatus.valueOf(status.trim().toUpperCase(Locale.ROOT)));
    }

    private Specification<FacilityAsset> byCapacity(Integer capacity) {
        if (capacity == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("capacity"), capacity);
    }

    private Specification<FacilityAsset> byLocation(String location) {
        if (location == null || location.isBlank()) {
            return null;
        }
        return (root, query, builder) -> builder.like(builder.lower(root.get("location")), "%" + location.trim().toLowerCase(Locale.ROOT) + "%");
    }

    private Specification<FacilityAsset> bySearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String keyword = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
        return (root, query, builder) -> builder.or(
                builder.like(builder.lower(root.get("name")), keyword),
                builder.like(builder.lower(root.get("location")), keyword),
                builder.like(builder.lower(root.get("description")), keyword)
        );
    }
}
