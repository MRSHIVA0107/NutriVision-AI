package com.nutrivision.service;

import com.nutrivision.model.NutrientDetail;
import com.nutrivision.model.NutritionAnalysisResult;
import com.nutrivision.model.NutritionCalculateRequest;
import com.nutrivision.model.UsdaFoodItem;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class NutritionCalculationService {

    // Standard Daily Values (DV) based on FDA 2,000 calorie reference diet
    public static final double DV_CALORIES = 2000.0;
    public static final double DV_PROTEIN = 50.0;        // g
    public static final double DV_CARBS = 275.0;         // g
    public static final double DV_FAT = 78.0;            // g
    public static final double DV_FIBER = 28.0;          // g
    public static final double DV_SUGARS = 50.0;         // g
    public static final double DV_SODIUM = 2300.0;       // mg
    public static final double DV_CALCIUM = 1300.0;      // mg
    public static final double DV_IRON = 18.0;           // mg
    public static final double DV_POTASSIUM = 4700.0;    // mg

    /**
     * Calculates nutrition for a request that specifies per100g values directly.
     */
    public NutritionAnalysisResult calculateFromPer100g(NutritionCalculateRequest request) {
        double grams = request.getQuantityGrams();
        Map<String, Double> per100g = request.getPer100g() != null ? request.getPer100g() : Collections.emptyMap();

        Double rawCalories = per100g.get("calories");
        Double rawProtein = per100g.get("protein");
        Double rawCarbs = per100g.get("carbohydrates") != null ? per100g.get("carbohydrates") : per100g.get("carbs");
        Double rawFat = per100g.get("fat");
        Double rawFiber = per100g.get("fiber");
        Double rawSugar = per100g.get("sugar") != null ? per100g.get("sugar") : per100g.get("sugars");
        Double rawSodium = per100g.get("sodium");

        List<String> missingNutrients = new ArrayList<>();
        if (rawCalories == null) missingNutrients.add("Calories");
        if (rawProtein == null) missingNutrients.add("Protein");
        if (rawCarbs == null) missingNutrients.add("Carbohydrates");
        if (rawFat == null) missingNutrients.add("Fat");
        if (rawFiber == null) missingNutrients.add("Fiber");
        if (rawSugar == null) missingNutrients.add("Sugar");
        if (rawSodium == null) missingNutrients.add("Sodium");

        Double calories = calculateNutrient(rawCalories, grams);
        Double protein = calculateNutrient(rawProtein, grams);
        Double carbs = calculateNutrient(rawCarbs, grams);
        Double fat = calculateNutrient(rawFat, grams);
        Double fiber = calculateNutrient(rawFiber, grams);
        Double sugar = calculateNutrient(rawSugar, grams);
        Double sodium = calculateNutrient(rawSodium, grams);

        NutritionAnalysisResult.MacroDistribution macroDist = calculateMacroDistribution(protein, carbs, fat);
        Map<String, Double> percentDVs = calculatePercentDailyValues(calories, protein, carbs, fat, fiber, sugar, sodium);

        List<NutrientDetail> detailed = new ArrayList<>();
        detailed.add(new NutrientDetail(1008, "Calories (Energy)", calories, "kcal", percentDVs.get("calories")));
        detailed.add(new NutrientDetail(1003, "Protein", protein, "g", percentDVs.get("protein")));
        detailed.add(new NutrientDetail(1005, "Total Carbohydrate", carbs, "g", percentDVs.get("carbohydrates")));
        detailed.add(new NutrientDetail(1004, "Total Fat", fat, "g", percentDVs.get("fat")));
        detailed.add(new NutrientDetail(1079, "Dietary Fiber", fiber, "g", percentDVs.get("fiber")));
        detailed.add(new NutrientDetail(2000, "Total Sugars", sugar, "g", percentDVs.get("sugar")));
        detailed.add(new NutrientDetail(1093, "Sodium", sodium, "mg", percentDVs.get("sodium")));

        return new NutritionAnalysisResult(
                request.getFdcId(),
                request.getFoodName(),
                grams,
                calories,
                protein,
                carbs,
                fat,
                fiber,
                sugar,
                sodium,
                macroDist,
                percentDVs,
                detailed,
                missingNutrients,
                request.getFdcId() != null ? "USDA FoodData Central" : "Standard Nutrition Reference",
                false,
                "Calculated nutrient = nutrient per 100g × " + grams + "g / 100"
        );
    }

    /**
     * Calculates nutrition from a USDA FoodItem object for the given gram quantity.
     */
    public NutritionAnalysisResult calculateFromUsdaItem(UsdaFoodItem foodItem, double quantityGrams) {
        Map<Integer, UsdaFoodItem.UsdaFoodNutrient> nutrientMap = new HashMap<>();
        if (foodItem.getFoodNutrients() != null) {
            for (UsdaFoodItem.UsdaFoodNutrient fn : foodItem.getFoodNutrients()) {
                if (fn.getNutrientId() != null) {
                    nutrientMap.put(fn.getNutrientId(), fn);
                }
            }
        }

        List<String> missingNutrients = new ArrayList<>();

        Double rawCalories = getNutrientValue(nutrientMap, 1008); // KCAL
        Double rawProtein = getNutrientValue(nutrientMap, 1003);  // g
        Double rawCarbs = getNutrientValue(nutrientMap, 1005);    // g
        Double rawFat = getNutrientValue(nutrientMap, 1004);      // g
        Double rawFiber = getNutrientValue(nutrientMap, 1079);    // g
        Double rawSugar = getNutrientValue(nutrientMap, 2000);    // g
        Double rawSodium = getNutrientValue(nutrientMap, 1093);   // mg
        Double rawCalcium = getNutrientValue(nutrientMap, 1087);  // mg
        Double rawIron = getNutrientValue(nutrientMap, 1089);     // mg
        Double rawPotassium = getNutrientValue(nutrientMap, 1092);// mg

        if (rawCalories == null) missingNutrients.add("Calories");
        if (rawProtein == null) missingNutrients.add("Protein");
        if (rawCarbs == null) missingNutrients.add("Carbohydrates");
        if (rawFat == null) missingNutrients.add("Fat");
        if (rawFiber == null) missingNutrients.add("Dietary Fiber");
        if (rawSugar == null) missingNutrients.add("Sugars");
        if (rawSodium == null) missingNutrients.add("Sodium");

        Double calories = calculateNutrient(rawCalories, quantityGrams);
        Double protein = calculateNutrient(rawProtein, quantityGrams);
        Double carbs = calculateNutrient(rawCarbs, quantityGrams);
        Double fat = calculateNutrient(rawFat, quantityGrams);
        Double fiber = calculateNutrient(rawFiber, quantityGrams);
        Double sugar = calculateNutrient(rawSugar, quantityGrams);
        Double sodium = calculateNutrient(rawSodium, quantityGrams);
        Double calcium = calculateNutrient(rawCalcium, quantityGrams);
        Double iron = calculateNutrient(rawIron, quantityGrams);
        Double potassium = calculateNutrient(rawPotassium, quantityGrams);

        NutritionAnalysisResult.MacroDistribution macroDist = calculateMacroDistribution(protein, carbs, fat);
        Map<String, Double> percentDVs = calculatePercentDailyValues(calories, protein, carbs, fat, fiber, sugar, sodium);
        if (calcium != null) percentDVs.put("calcium", round(calcium / DV_CALCIUM * 100.0, 1));
        if (iron != null) percentDVs.put("iron", round(iron / DV_IRON * 100.0, 1));
        if (potassium != null) percentDVs.put("potassium", round(potassium / DV_POTASSIUM * 100.0, 1));

        List<NutrientDetail> detailed = new ArrayList<>();
        detailed.add(new NutrientDetail(1008, "Calories (Energy)", calories, "kcal", percentDVs.get("calories")));
        detailed.add(new NutrientDetail(1003, "Protein", protein, "g", percentDVs.get("protein")));
        detailed.add(new NutrientDetail(1005, "Total Carbohydrate", carbs, "g", percentDVs.get("carbohydrates")));
        detailed.add(new NutrientDetail(1004, "Total Fat", fat, "g", percentDVs.get("fat")));
        detailed.add(new NutrientDetail(1079, "Dietary Fiber", fiber, "g", percentDVs.get("fiber")));
        detailed.add(new NutrientDetail(2000, "Total Sugars", sugar, "g", percentDVs.get("sugar")));
        detailed.add(new NutrientDetail(1093, "Sodium", sodium, "mg", percentDVs.get("sodium")));
        if (calcium != null) detailed.add(new NutrientDetail(1087, "Calcium", calcium, "mg", percentDVs.get("calcium")));
        if (iron != null) detailed.add(new NutrientDetail(1089, "Iron", iron, "mg", percentDVs.get("iron")));
        if (potassium != null) detailed.add(new NutrientDetail(1092, "Potassium", potassium, "mg", percentDVs.get("potassium")));

        return new NutritionAnalysisResult(
                foodItem.getFdcId(),
                foodItem.getDescription(),
                quantityGrams,
                calories,
                protein,
                carbs,
                fat,
                fiber,
                sugar,
                sodium,
                macroDist,
                percentDVs,
                detailed,
                missingNutrients,
                "USDA FoodData Central (" + (foodItem.getDataType() != null ? foodItem.getDataType() : "Verified") + ")",
                false,
                "Calculated nutrient = nutrient per 100g × " + quantityGrams + "g / 100"
        );
    }

    /**
     * Core nutrient scaling formula: nutrient per 100g × quantity in grams / 100
     */
    public Double calculateNutrient(Double per100gValue, double quantityGrams) {
        if (per100gValue == null) {
            return null;
        }
        double calculated = (per100gValue * quantityGrams) / 100.0;
        return round(calculated, 1);
    }

    public NutritionAnalysisResult.MacroDistribution calculateMacroDistribution(Double proteinGrams, Double carbGrams, Double fatGrams) {
        double p = proteinGrams != null ? proteinGrams : 0.0;
        double c = carbGrams != null ? carbGrams : 0.0;
        double f = fatGrams != null ? fatGrams : 0.0;

        double proteinCal = round(p * 4.0, 1);
        double carbCal = round(c * 4.0, 1);
        double fatCal = round(f * 9.0, 1);
        double totalMacroCal = proteinCal + carbCal + fatCal;

        double proteinPct = totalMacroCal > 0 ? round((proteinCal / totalMacroCal) * 100.0, 1) : 0.0;
        double carbPct = totalMacroCal > 0 ? round((carbCal / totalMacroCal) * 100.0, 1) : 0.0;
        double fatPct = totalMacroCal > 0 ? round((fatCal / totalMacroCal) * 100.0, 1) : 0.0;

        return new NutritionAnalysisResult.MacroDistribution(
                proteinCal, carbCal, fatCal, proteinPct, carbPct, fatPct
        );
    }

    public Map<String, Double> calculatePercentDailyValues(
            Double calories, Double protein, Double carbs, Double fat, Double fiber, Double sugar, Double sodium) {
        Map<String, Double> dvMap = new HashMap<>();
        if (calories != null) dvMap.put("calories", round((calories / DV_CALORIES) * 100.0, 1));
        if (protein != null) dvMap.put("protein", round((protein / DV_PROTEIN) * 100.0, 1));
        if (carbs != null) dvMap.put("carbohydrates", round((carbs / DV_CARBS) * 100.0, 1));
        if (fat != null) dvMap.put("fat", round((fat / DV_FAT) * 100.0, 1));
        if (fiber != null) dvMap.put("fiber", round((fiber / DV_FIBER) * 100.0, 1));
        if (sugar != null) dvMap.put("sugar", round((sugar / DV_SUGARS) * 100.0, 1));
        if (sodium != null) dvMap.put("sodium", round((sodium / DV_SODIUM) * 100.0, 1));
        return dvMap;
    }

    private Double getNutrientValue(Map<Integer, UsdaFoodItem.UsdaFoodNutrient> map, Integer nutrientId) {
        UsdaFoodItem.UsdaFoodNutrient fn = map.get(nutrientId);
        return fn != null ? fn.getValue() : null;
    }

    private double round(double value, int places) {
        BigDecimal bd = BigDecimal.valueOf(value);
        bd = bd.setScale(places, RoundingMode.HALF_UP);
        return bd.doubleValue();
    }
}
