package com.smartcampus.modulec.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.smartcampus.modulec.domain.AvailabilityWindow;
import com.smartcampus.modulec.domain.FacilityAsset;
import com.smartcampus.modulec.domain.ResourceStatus;
import com.smartcampus.modulec.domain.ResourceType;
import com.smartcampus.modulec.domain.UserRole;
import com.smartcampus.modulec.dto.AvailabilityWindowRequest;
import com.smartcampus.modulec.dto.FacilityAssetQuery;
import com.smartcampus.modulec.dto.FacilityAssetRequest;
import com.smartcampus.modulec.dto.FacilityAssetResponse;
import com.smartcampus.modulec.repository.FacilityAssetRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FacilityAssetServiceTest {

    @Mock
    private FacilityAssetRepository facilityAssetRepository;

    @InjectMocks
    private FacilityAssetService facilityAssetService;

    @Test
    void createResourceRequiresAdminRole() {
        SecurityException exception = assertThrows(SecurityException.class,
                () -> facilityAssetService.createResource(validRequest(), UserRole.STUDENT));

        assertEquals("Only admins can modify facilities and assets.", exception.getMessage());
        verifyNoInteractions(facilityAssetRepository);
    }

    @Test
    void createResourceRejectsDuplicateNameAtSameLocation() {
        FacilityAsset existing = new FacilityAsset();
        existing.setId(9L);
        existing.setName("Main Auditorium");
        existing.setLocation("Building A");

        when(facilityAssetRepository.findByNameIgnoreCaseAndLocationIgnoreCase("Main Auditorium", "Building A"))
                .thenReturn(Optional.of(existing));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> facilityAssetService.createResource(validRequest(), UserRole.ADMIN));

        assertEquals("A resource with the same name already exists at this location.", exception.getMessage());
    }

    @Test
    void createResourceNormalizesAvailabilityAndOptionalFields() {
        when(facilityAssetRepository.findByNameIgnoreCaseAndLocationIgnoreCase("Design Lab", "Innovation Wing"))
                .thenReturn(Optional.empty());
        when(facilityAssetRepository.save(any(FacilityAsset.class))).thenAnswer(invocation -> {
            FacilityAsset resource = invocation.getArgument(0);
            resource.setId(42L);
            return resource;
        });

        FacilityAssetRequest request = new FacilityAssetRequest(
                "  Design Lab  ",
                ResourceType.LAB,
                24,
                "  Innovation Wing  ",
                "  Creative prototyping space.  ",
                " https://example.com/resource.jpg ",
                ResourceStatus.ACTIVE,
                new AvailabilityWindowRequest(
                        List.of("wednesday", "Monday", "Monday"),
                        "08:00",
                        "16:00",
                        "  Open for supervised sessions only.  "
                )
        );

        FacilityAssetResponse response = facilityAssetService.createResource(request, UserRole.ADMIN);

        assertEquals("Design Lab", response.name());
        assertEquals("Innovation Wing", response.location());
        assertEquals("Creative prototyping space.", response.description());
        assertEquals("https://example.com/resource.jpg", response.imageUrl());
        assertEquals(List.of("Monday", "Wednesday"), response.availabilityWindow().daysOfWeek());
        assertTrue(response.available());
    }

    @Test
    void getResourcesRejectsUnsupportedTypeFilter() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> facilityAssetService.getResources(new FacilityAssetQuery("auditorium", null, null, null, null)));

        assertEquals("Unsupported resource type. Use one of: LAB, HALL, MEETING_ROOM, EQUIPMENT.", exception.getMessage());
    }

    @Test
    void createResourceRejectsInvalidImageUrl() {
        FacilityAssetRequest request = new FacilityAssetRequest(
                "Main Auditorium",
                ResourceType.HALL,
                500,
                "Building A",
                "Large shared hall",
                "ftp://files.example.com/auditorium.png",
                ResourceStatus.ACTIVE,
                new AvailabilityWindowRequest(
                        List.of("Monday", "Tuesday"),
                        "08:00",
                        "18:00",
                        null
                )
        );

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> facilityAssetService.createResource(request, UserRole.ADMIN));

        assertEquals("Image URL must be an absolute HTTP or HTTPS URL.", exception.getMessage());
    }

    private FacilityAssetRequest validRequest() {
        return new FacilityAssetRequest(
                "Main Auditorium",
                ResourceType.HALL,
                500,
                "Building A",
                "Large shared hall",
                "https://example.com/auditorium.jpg",
                ResourceStatus.ACTIVE,
                new AvailabilityWindowRequest(
                        List.of("Monday", "Tuesday"),
                        "08:00",
                        "18:00",
                        null
                )
        );
    }
}
