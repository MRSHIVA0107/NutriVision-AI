package com.nutrivision.model;

public record NutrientDetail(
        Integer nutrientId,
        String nutrientName,
        Double value,
        String unitName,
        Double percentDailyValue,
        boolean isEstimated
) {
    public NutrientDetail(Integer nutrientId, String nutrientName, Double value, String unitName, Double percentDailyValue) {
        this(nutrientId, nutrientName, value, unitName, percentDailyValue, false);
    }
}
