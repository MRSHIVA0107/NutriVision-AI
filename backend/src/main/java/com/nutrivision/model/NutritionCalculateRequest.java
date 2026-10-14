package com.nutrivision.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public class NutritionCalculateRequest {

    private Integer fdcId;

    @NotBlank(message = "Food name is required")
    private String foodName;

    @NotNull(message = "Quantity in grams is required")
    @DecimalMin(value = "1.0", message = "Quantity must be at least 1 gram")
    private Double quantityGrams;

    // Optional map of nutrient values per 100g (e.g. calories, protein, carbohydrates, fat, fiber, sugar, sodium)
    private Map<String, Double> per100g;

    public NutritionCalculateRequest() {
    }

    public NutritionCalculateRequest(Integer fdcId, String foodName, Double quantityGrams, Map<String, Double> per100g) {
        this.fdcId = fdcId;
        this.foodName = foodName;
        this.quantityGrams = quantityGrams;
        this.per100g = per100g;
    }

    public Integer getFdcId() {
        return fdcId;
    }

    public void setFdcId(Integer fdcId) {
        this.fdcId = fdcId;
    }

    public String getFoodName() {
        return foodName;
    }

    public void setFoodName(String foodName) {
        this.foodName = foodName;
    }

    public Double getQuantityGrams() {
        return quantityGrams;
    }

    public void setQuantityGrams(Double quantityGrams) {
        this.quantityGrams = quantityGrams;
    }

    public Map<String, Double> getPer100g() {
        return per100g;
    }

    public void setPer100g(Map<String, Double> per100g) {
        this.per100g = per100g;
    }
}
