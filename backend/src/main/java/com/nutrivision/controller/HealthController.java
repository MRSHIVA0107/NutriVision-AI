package com.nutrivision.controller;

import com.nutrivision.model.HealthStatusResponse;
import com.nutrivision.service.FoodRecognitionService;
import com.nutrivision.service.UsdaNutritionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final FoodRecognitionService foodRecognitionService;
    private final UsdaNutritionService usdaNutritionService;

    public HealthController(FoodRecognitionService foodRecognitionService, UsdaNutritionService usdaNutritionService) {
        this.foodRecognitionService = foodRecognitionService;
        this.usdaNutritionService = usdaNutritionService;
    }

    @GetMapping("/health")
    public ResponseEntity<HealthStatusResponse> getHealth() {
        boolean aiConfigured = foodRecognitionService.isConfigured();
        boolean usdaConfigured = usdaNutritionService.isConfigured();

        return ResponseEntity.ok(HealthStatusResponse.up(aiConfigured, usdaConfigured));
    }
}
