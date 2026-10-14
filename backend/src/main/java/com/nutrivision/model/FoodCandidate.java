package com.nutrivision.model;

public record FoodCandidate(
        String name,
        double confidence,
        String category,
        String description
) {
    public FoodCandidate(String name, double confidence) {
        this(name, confidence, "General Food", null);
    }
}
