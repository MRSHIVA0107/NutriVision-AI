package com.nutrivision.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UsdaFoodItem {

    private Integer fdcId;
    private String description;
    private String dataType;
    private String foodCategory;
    private List<UsdaFoodNutrient> foodNutrients;

    // Derived map of nutrients per 100g
    private Map<String, Double> nutrientsPer100g;

    public UsdaFoodItem() {
    }

    public Integer getFdcId() {
        return fdcId;
    }

    public void setFdcId(Integer fdcId) {
        this.fdcId = fdcId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDataType() {
        return dataType;
    }

    public void setDataType(String dataType) {
        this.dataType = dataType;
    }

    public String getFoodCategory() {
        return foodCategory;
    }

    public void setFoodCategory(String foodCategory) {
        this.foodCategory = foodCategory;
    }

    public List<UsdaFoodNutrient> getFoodNutrients() {
        return foodNutrients;
    }

    public void setFoodNutrients(List<UsdaFoodNutrient> foodNutrients) {
        this.foodNutrients = foodNutrients;
    }

    public Map<String, Double> getNutrientsPer100g() {
        return nutrientsPer100g;
    }

    public void setNutrientsPer100g(Map<String, Double> nutrientsPer100g) {
        this.nutrientsPer100g = nutrientsPer100g;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UsdaFoodNutrient {
        private Integer nutrientId;
        private String nutrientName;
        private String nutrientNumber;
        private String unitName;
        private Double value;
        private Double percentDailyValue;

        public UsdaFoodNutrient() {
        }

        public Integer getNutrientId() {
            return nutrientId;
        }

        public void setNutrientId(Integer nutrientId) {
            this.nutrientId = nutrientId;
        }

        public String getNutrientName() {
            return nutrientName;
        }

        public void setNutrientName(String nutrientName) {
            this.nutrientName = nutrientName;
        }

        public String getNutrientNumber() {
            return nutrientNumber;
        }

        public void setNutrientNumber(String nutrientNumber) {
            this.nutrientNumber = nutrientNumber;
        }

        public String getUnitName() {
            return unitName;
        }

        public void setUnitName(String unitName) {
            this.unitName = unitName;
        }

        public Double getValue() {
            return value;
        }

        public void setValue(Double value) {
            this.value = value;
        }

        public Double getPercentDailyValue() {
            return percentDailyValue;
        }

        public void setPercentDailyValue(Double percentDailyValue) {
            this.percentDailyValue = percentDailyValue;
        }
    }
}
