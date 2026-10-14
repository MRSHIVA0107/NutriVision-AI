package com.nutrivision.model;

import java.time.Instant;
import java.util.Map;

public record HealthStatusResponse(
        String status,
        String service,
        String version,
        Instant timestamp,
        Map<String, Boolean> integrations,
        String message
) {
    public static HealthStatusResponse up(boolean aiConfigured, boolean usdaConfigured) {
        return new HealthStatusResponse(
                "UP",
                "NutriVision AI Backend",
                "1.0.0",
                Instant.now(),
                Map.of(
                        "aiVisionConfigured", aiConfigured,
                        "usdaApiConfigured", usdaConfigured
                ),
                "NutriVision backend services are healthy and operational"
        );
    }
}
