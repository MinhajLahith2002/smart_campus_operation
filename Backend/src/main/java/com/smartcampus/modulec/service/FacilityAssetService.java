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
import java.net.URI;
import java.net.URISyntaxException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FacilityAssetService {

    private static final List<String> DAY_ORDER = List.of(
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    );
    private static final Map<String, String> DAY_LOOKUP = DAY_ORDER.stream()
            .collect(java.util.stream.Collectors.toMap(
                    day -> day.toLowerCase(Locale.ROOT),
                    day -> day
            ));
    private static final Set<String> SUPPORTED_IMAGE_SCHEMES = Set.of("http", "https");

    private final FacilityAssetRepository facilityAssetRepository;

    public FacilityAssetService(FacilityAssetRepository facilityAssetRepository) {
        this.facilityAssetRepository = facilityAssetRepository;
    }

    @Transactional(readOnly = true)
    public List<FacilityAssetResponse> getResources(FacilityAssetQuery query) {
        ResourceType type = parseResourceType(query.type());
        ResourceStatus status = parseResourceStatus(query.status());

        Specification<FacilityAsset> specification = Specification.where(byType(type))
                .and(byStatus(status))
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
        apply(resource, request, null);
        OffsetDateTime now = OffsetDateTime.now();
        resource.setCreatedAt(now);
        resource.setUpdatedAt(now);

        return map(facilityAssetRepository.save(resource));
    }

    public FacilityAssetResponse updateResource(Long resourceId, FacilityAssetRequest request, UserRole actorRole) {
        ensureAdmin(actorRole);

        FacilityAsset resource = findResource(resourceId);
        apply(resource, request, resourceId);
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
        if (actorRole == null || actorRole != UserRole.ADMIN) {
            throw new SecurityException("Only admins can modify facilities and assets.");
        }
    }

    private void apply(FacilityAsset resource, FacilityAssetRequest request, Long currentResourceId) {
        String normalizedName = request.name().trim();
        String normalizedLocation = request.location().trim();
        String normalizedImageUrl = normalizeImageUrl(request.imageUrl());
        AvailabilityWindow availabilityWindow = toAvailabilityWindow(request.availabilityWindow());

        ensureUniqueResource(normalizedName, normalizedLocation, currentResourceId);

        resource.setName(normalizedName);
        resource.setType(request.type());
        resource.setCapacity(request.capacity());
        resource.setLocation(normalizedLocation);
        resource.setDescription(blankToNull(request.description()));
        resource.setImageUrl(normalizedImageUrl);
        resource.setStatus(request.status());
        resource.setAvailabilityWindow(availabilityWindow);
    }

    private void validateAvailabilityWindow(AvailabilityWindowRequest availabilityWindow) {
        if (availabilityWindow.openTime().compareTo(availabilityWindow.closeTime()) >= 0) {
            throw new IllegalArgumentException("Closing time must be later than opening time.");
        }
    }

    private AvailabilityWindow toAvailabilityWindow(AvailabilityWindowRequest request) {
        validateAvailabilityWindow(request);
        List<String> normalizedDays = normalizeDays(request.daysOfWeek());

        AvailabilityWindow availabilityWindow = new AvailabilityWindow();
        availabilityWindow.setDaysOfWeek(String.join(",", normalizedDays));
        availabilityWindow.setOpenTime(request.openTime());
        availabilityWindow.setCloseTime(request.closeTime());
        availabilityWindow.setNotes(blankToNull(request.notes()));
        return availabilityWindow;
    }

    private FacilityAssetResponse map(FacilityAsset resource) {
        AvailabilityWindow availabilityWindow = resource.getAvailabilityWindow();
        List<String> days = availabilityWindow == null || availabilityWindow.getDaysOfWeek() == null
                ? List.of()
                : Arrays.stream(availabilityWindow.getDaysOfWeek().split(","))
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
                        availabilityWindow == null ? null : availabilityWindow.getOpenTime(),
                        availabilityWindow == null ? null : availabilityWindow.getCloseTime(),
                        availabilityWindow == null ? null : availabilityWindow.getNotes()
                ),
                resource.getStatus(),
                resource.getStatus() == ResourceStatus.ACTIVE && !days.isEmpty() && availabilityWindow != null,
                resource.getCreatedAt(),
                resource.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ResourceType parseResourceType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        try {
            return ResourceType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unsupported resource type. Use one of: LAB, HALL, MEETING_ROOM, EQUIPMENT.");
        }
    }

    private ResourceStatus parseResourceStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ResourceStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unsupported resource status. Use one of: ACTIVE, OUT_OF_SERVICE.");
        }
    }

    private void ensureUniqueResource(String name, String location, Long currentResourceId) {
        facilityAssetRepository.findByNameIgnoreCaseAndLocationIgnoreCase(name, location)
                .filter(existing -> currentResourceId == null || !existing.getId().equals(currentResourceId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("A resource with the same name already exists at this location.");
                });
    }

    private List<String> normalizeDays(List<String> daysOfWeek) {
        LinkedHashSet<String> normalizedDays = new LinkedHashSet<>();
        for (String day : daysOfWeek) {
            String normalized = DAY_LOOKUP.get(day.trim().toLowerCase(Locale.ROOT));
            if (normalized == null) {
                throw new IllegalArgumentException("Availability days must be valid weekday names.");
            }
            normalizedDays.add(normalized);
        }

        return DAY_ORDER.stream()
                .filter(normalizedDays::contains)
                .toList();
    }

    private String normalizeImageUrl(String imageUrl) {
        String normalized = blankToNull(imageUrl);
        if (normalized == null) {
            return null;
        }

        try {
            URI uri = new URI(normalized);
            if (!uri.isAbsolute() || !SUPPORTED_IMAGE_SCHEMES.contains(uri.getScheme().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("Image URL must be an absolute HTTP or HTTPS URL.");
            }
            return normalized;
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("Image URL must be an absolute HTTP or HTTPS URL.");
        }
    }

    private Specification<FacilityAsset> byType(ResourceType type) {
        if (type == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("type"), type);
    }

    private Specification<FacilityAsset> byStatus(ResourceStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("status"), status);
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
