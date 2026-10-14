package com.nutrivision.model;

import java.util.List;
import java.util.Map;

public record NutritionAnalysisResult(
        Integer fdcId,
        String foodName,
        Double quantityGrams,
        Double calories,
        Double protein,
        Double carbohydrates,
        Double fat,
        Double fiber,
        Double sugar,
        Double sodium,
        MacroDistribution macroDistribution,
        Map<String, Double> percentDailyValues,
        List<NutrientDetail> detailedNutrients,
        List<String> missingNutrients,
        String dataSource,
        boolean isEstimated,
        String calculationFormula
) {
    public record MacroDistribution(
            Double proteinCalories,
            Double carbCalories,
            Double fatCalories,
            Double proteinPercent,
            Double carbPercent,
            Double fatPercent
    ) {}
}
