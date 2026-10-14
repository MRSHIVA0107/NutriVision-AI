package com.nutrivision.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nutrivision.exception.ApiException;
import com.nutrivision.model.UsdaFoodItem;
import com.nutrivision.model.UsdaSearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
public class UsdaNutritionService {

    private static final Logger log = LoggerFactory.getLogger(UsdaNutritionService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.usda.base-url:https://api.nal.usda.gov/fdc/v1}")
    private String usdaBaseUrl;

    @Value("${app.usda.api-key:DEMO_KEY}")
    private String usdaApiKey;

    public UsdaNutritionService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return usdaApiKey != null && !usdaApiKey.trim().isEmpty();
    }

    public String getApiKey() {
        return usdaApiKey;
    }

    /**
     * Searches foods from USDA FoodData Central.
     */
    public List<UsdaFoodItem> searchFoods(String query, int pageSize) {
        if (query == null || query.trim().isEmpty()) {
            throw new ApiException("Search query cannot be empty", HttpStatus.BAD_REQUEST, "EMPTY_QUERY");
        }

        String trimmedQuery = query.trim();
        int validPageSize = Math.max(1, Math.min(pageSize, 25));

        String url = UriComponentsBuilder.fromHttpUrl(usdaBaseUrl + "/foods/search")
                .queryParam("api_key", usdaApiKey)
                .queryParam("query", trimmedQuery)
                .queryParam("pageSize", validPageSize)
                .queryParam("dataType", "Foundation,SR Legacy,Survey (FNDDS),Branded")
                .build()
                .toUriString();

        try {
            log.info("Querying USDA FoodData Central for query: '{}' (pageSize: {})", trimmedQuery, validPageSize);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                UsdaSearchResponse searchResponse = objectMapper.readValue(response.getBody(), UsdaSearchResponse.class);
                if (searchResponse.getFoods() != null) {
                    // Enrich items with normalized per-100g nutrient maps
                    for (UsdaFoodItem item : searchResponse.getFoods()) {
                        item.setNutrientsPer100g(extractPer100gNutrients(item));
                    }
                    return searchResponse.getFoods();
                }
            }
            return Collections.emptyList();

        } catch (HttpClientErrorException.Forbidden | HttpClientErrorException.TooManyRequests ex) {
            log.warn("USDA API rate limit reached or key invalid: {}", ex.getMessage());
            throw new ApiException(
                    "USDA FoodData Central API key rate limit exceeded or key is unauthorized. " +
                            "Please configure a valid USDA_API_KEY from https://fdc.nal.usda.gov/api-key-signup.html",
                    HttpStatus.TOO_MANY_REQUESTS,
                    "USDA_RATE_LIMITED"
            );
        } catch (HttpClientErrorException ex) {
            log.error("USDA API client error {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new ApiException("USDA API error: " + ex.getMessage(), HttpStatus.valueOf(ex.getStatusCode().value()), "USDA_CLIENT_ERROR");
        } catch (HttpServerErrorException ex) {
            log.error("USDA API server error: {}", ex.getMessage());
            throw new ApiException("USDA FoodData Central service is temporarily unavailable", HttpStatus.SERVICE_UNAVAILABLE, "USDA_SERVICE_UNAVAILABLE");
        } catch (Exception ex) {
            log.error("Unexpected error querying USDA API: {}", ex.getMessage(), ex);
            throw new ApiException("Failed to query USDA FoodData Central: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR, "USDA_SEARCH_FAILED");
        }
    }

    /**
     * Fetches single food item details by fdcId.
     */
    public UsdaFoodItem getFoodById(int fdcId) {
        String url = UriComponentsBuilder.fromHttpUrl(usdaBaseUrl + "/food/" + fdcId)
                .queryParam("api_key", usdaApiKey)
                .build()
                .toUriString();

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                UsdaFoodItem item = objectMapper.readValue(response.getBody(), UsdaFoodItem.class);
                item.setNutrientsPer100g(extractPer100gNutrients(item));
                return item;
            }
            throw new ApiException("Food item not found with FDC ID: " + fdcId, HttpStatus.NOT_FOUND, "FOOD_NOT_FOUND");
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ApiException("Food item with FDC ID " + fdcId + " was not found in USDA database.", HttpStatus.NOT_FOUND, "FOOD_NOT_FOUND");
        } catch (Exception ex) {
            log.error("Failed to fetch food details for FDC ID {}: {}", fdcId, ex.getMessage());
            throw new ApiException("Failed to fetch USDA food details: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR, "USDA_FETCH_FAILED");
        }
    }

    private Map<String, Double> extractPer100gNutrients(UsdaFoodItem item) {
        Map<String, Double> map = new HashMap<>();
        if (item.getFoodNutrients() == null) return map;

        for (UsdaFoodItem.UsdaFoodNutrient fn : item.getFoodNutrients()) {
            if (fn.getNutrientId() == null || fn.getValue() == null) continue;

            switch (fn.getNutrientId()) {
                case 1008 -> map.put("calories", fn.getValue());
                case 1003 -> map.put("protein", fn.getValue());
                case 1004 -> map.put("fat", fn.getValue());
                case 1005 -> map.put("carbohydrates", fn.getValue());
                case 1079 -> map.put("fiber", fn.getValue());
                case 2000 -> map.put("sugar", fn.getValue());
                case 1093 -> map.put("sodium", fn.getValue());
                case 1087 -> map.put("calcium", fn.getValue());
                case 1089 -> map.put("iron", fn.getValue());
                case 1092 -> map.put("potassium", fn.getValue());
                case 1258 -> map.put("saturatedFat", fn.getValue());
                case 1253 -> map.put("cholesterol", fn.getValue());
            }
        }
        return map;
    }
}
