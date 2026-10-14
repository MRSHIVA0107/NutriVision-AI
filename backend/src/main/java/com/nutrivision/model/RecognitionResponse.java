package com.nutrivision.model;

import java.util.List;

public record RecognitionResponse(
        boolean success,
        String primaryFood,
        double confidence,
        List<FoodCandidate> candidates,
        String message,
        String errorCode
) {
    public static RecognitionResponse success(String primaryFood, double confidence, List<FoodCandidate> candidates) {
        return new RecognitionResponse(true, primaryFood, confidence, candidates, "Food successfully recognized", null);
    }

    public static RecognitionResponse error(String errorCode, String message) {
        return new RecognitionResponse(false, null, 0.0, List.of(), message, errorCode);
    }
}
