package com.nutrivision;

import com.nutrivision.model.NutritionAnalysisResult;
import com.nutrivision.model.NutritionCalculateRequest;
import com.nutrivision.service.NutritionCalculationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class NutritionCalculationServiceTest {

    private NutritionCalculationService calculationService;

    @BeforeEach
    void setUp() {
        calculationService = new NutritionCalculationService();
    }

    @Test
    @DisplayName("Should accurately calculate nutrients using formula: nutrient per 100g * quantity / 100")
    void testNutrientScalingFormula() {
        // Salmon: 182 kcal, 25.4g protein, 8.1g fat, 0g carbs, 60mg sodium per 100g
        Map<String, Double> per100g = Map.of(
                "calories", 182.0,
                "protein", 25.4,
                "carbohydrates", 0.0,
                "fat", 8.1,
                "fiber", 0.0,
                "sugar", 0.0,
                "sodium", 60.0
        );

        NutritionCalculateRequest request = new NutritionCalculateRequest(
                175168,
                "Salmon, Atlantic, wild, cooked",
                150.0, // 150 grams
                per100g
        );

        NutritionAnalysisResult result = calculationService.calculateFromPer100g(request);

        assertNotNull(result);
        assertEquals(150.0, result.quantityGrams());
        // 182 * 1.5 = 273.0 kcal
        assertEquals(273.0, result.calories());
        // 25.4 * 1.5 = 38.1g protein
        assertEquals(38.1, result.protein());
        // 8.1 * 1.5 = 12.15 -> rounded to 12.2g or 12.1g
        assertTrue(Math.abs(12.15 - result.fat()) <= 0.1);
        // 0.0 * 1.5 = 0.0g carbs
        assertEquals(0.0, result.carbohydrates());
        // 60.0 * 1.5 = 90.0mg sodium
        assertEquals(90.0, result.sodium());
    }

    @Test
    @DisplayName("Should calculate macronutrient calorie distribution percentages")
    void testMacroDistribution() {
        // 25g protein = 100 kcal, 25g carbs = 100 kcal, 10g fat = 90 kcal. Total = 290 kcal
        NutritionAnalysisResult.MacroDistribution macroDist =
                calculationService.calculateMacroDistribution(25.0, 25.0, 10.0);

        assertEquals(100.0, macroDist.proteinCalories());
        assertEquals(100.0, macroDist.carbCalories());
        assertEquals(90.0, macroDist.fatCalories());

        // 100 / 290 * 100 = 34.5%
        assertEquals(34.5, macroDist.proteinPercent());
        assertEquals(34.5, macroDist.carbPercent());
        // 90 / 290 * 100 = 31.0%
        assertEquals(31.0, macroDist.fatPercent());
    }

    @Test
    @DisplayName("Should calculate FDA Daily Value percentages correctly")
    void testDailyValuePercentages() {
        // 500 kcal / 2000 kcal = 25.0% DV
        // 25g protein / 50g = 50.0% DV
        // 1150mg sodium / 2300mg = 50.0% DV
        Map<String, Double> dvs = calculationService.calculatePercentDailyValues(
                500.0, 25.0, 55.0, 15.6, 7.0, 10.0, 1150.0
        );

        assertEquals(25.0, dvs.get("calories"));
        assertEquals(50.0, dvs.get("protein"));
        assertEquals(50.0, dvs.get("sodium"));
        assertEquals(25.0, dvs.get("fiber"));
    }

    @Test
    @DisplayName("Should detect missing nutrient data clearly")
    void testMissingNutrientFlagging() {
        // Only calories and protein provided; fat, carbs, fiber, sugar, sodium missing
        Map<String, Double> per100g = Map.of(
                "calories", 100.0,
                "protein", 20.0
        );

        NutritionCalculateRequest request = new NutritionCalculateRequest(
                99999,
                "Partial Nutrition Item",
                100.0,
                per100g
        );

        NutritionAnalysisResult result = calculationService.calculateFromPer100g(request);

        assertNotNull(result);
        assertTrue(result.missingNutrients().contains("Carbohydrates"));
        assertTrue(result.missingNutrients().contains("Fat"));
        assertTrue(result.missingNutrients().contains("Fiber"));
        assertTrue(result.missingNutrients().contains("Sugar"));
        assertTrue(result.missingNutrients().contains("Sodium"));
        assertFalse(result.missingNutrients().contains("Calories"));
        assertFalse(result.missingNutrients().contains("Protein"));
    }
}
