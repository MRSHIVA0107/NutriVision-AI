package com.nutrivision.controller;

import com.nutrivision.model.NutritionAnalysisResult;
import com.nutrivision.model.NutritionCalculateRequest;
import com.nutrivision.model.UsdaFoodItem;
import com.nutrivision.service.NutritionCalculationService;
import com.nutrivision.service.UsdaNutritionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nutrition")
public class NutritionController {

    private final UsdaNutritionService usdaNutritionService;
    private final NutritionCalculationService nutritionCalculationService;

    public NutritionController(
            UsdaNutritionService usdaNutritionService,
            NutritionCalculationService nutritionCalculationService) {
        this.usdaNutritionService = usdaNutritionService;
        this.nutritionCalculationService = nutritionCalculationService;
    }

    /**
     * Search USDA FoodData Central for matching food items.
     */
    @GetMapping("/search")
    public ResponseEntity<List<UsdaFoodItem>> searchFoods(
            @RequestParam("query") String query,
            @RequestParam(value = "pageSize", defaultValue = "5") int pageSize) {
        List<UsdaFoodItem> results = usdaNutritionService.searchFoods(query, pageSize);
        return ResponseEntity.ok(results);
    }

    /**
     * Calculates scaled nutrients based on quantity in grams.
     * Formula: Calculated nutrient = nutrient per 100g × quantity in grams / 100.
     */
    @PostMapping("/calculate")
    public ResponseEntity<NutritionAnalysisResult> calculateNutrition(
            @Valid @RequestBody NutritionCalculateRequest request) {
        NutritionAnalysisResult result;

        if (request.getFdcId() != null && (request.getPer100g() == null || request.getPer100g().isEmpty())) {
            // Fetch USDA official reference record by FDC ID
            UsdaFoodItem item = usdaNutritionService.getFoodById(request.getFdcId());
            result = nutritionCalculationService.calculateFromUsdaItem(item, request.getQuantityGrams());
        } else {
            // Calculate directly from supplied per 100g nutrient values
            result = nutritionCalculationService.calculateFromPer100g(request);
        }

        return ResponseEntity.ok(result);
    }
}
