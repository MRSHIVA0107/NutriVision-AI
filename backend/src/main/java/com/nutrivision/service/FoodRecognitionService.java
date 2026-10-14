package com.nutrivision.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nutrivision.exception.ApiException;
import com.nutrivision.model.FoodCandidate;
import com.nutrivision.model.RecognitionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
public class FoodRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(FoodRecognitionService.class);

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.api-key:}")
    private String aiApiKey;

    @Value("${app.ai.gemini-endpoint:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent}")
    private String geminiEndpoint;

    public FoodRecognitionService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return aiApiKey != null && !aiApiKey.trim().isEmpty();
    }

    /**
     * Recognizes food from an uploaded image file using multimodal AI vision.
     */
    public RecognitionResponse recognizeFood(MultipartFile file) {
        // 1. Validation
        if (file == null || file.isEmpty()) {
            throw new ApiException("No image file was provided for analysis.", HttpStatus.BAD_REQUEST, "EMPTY_FILE");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new ApiException(
                    "Unsupported image format. Allowed formats: JPEG, PNG, WebP.",
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "UNSUPPORTED_IMAGE_FORMAT"
            );
        }

        // 2. Check for configured AI Vision API Key
        if (!isConfigured()) {
            log.warn("AI recognition requested but AI_VISION_API_KEY is not configured.");
            return RecognitionResponse.error(
                    "AI_KEY_MISSING",
                    "AI Vision API key is not configured on the backend server. " +
                            "Please set AI_VISION_API_KEY (or GEMINI_API_KEY) in the backend environment variables. " +
                            "In the meantime, you can search and analyze any meal manually below."
            );
        }

        try {
            // 3. Convert image to Base64
            byte[] imageBytes = file.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            // 4. Build Gemini Vision API request
            String requestUrl = geminiEndpoint + "?key=" + aiApiKey;

            Map<String, Object> promptPart = Map.of(
                    "text", "You are an expert culinary and nutrition computer vision model. " +
                            "Analyze this food image. Identify the primary food item and any secondary candidate items visible. " +
                            "Output ONLY a JSON object with this exact structure: " +
                            "{\"primaryFood\": \"Name of food\", \"confidence\": 0.95, \"candidates\": [{\"name\": \"...\", \"confidence\": 0.95, \"category\": \"...\", \"description\": \"...\"}]}. " +
                            "Do not include explanation or markdown code fences outside JSON."
            );

            Map<String, Object> inlineData = Map.of(
                    "mime_type", contentType,
                    "data", base64Image
            );
            Map<String, Object> imagePart = Map.of("inline_data", inlineData);

            Map<String, Object> content = Map.of("parts", List.of(promptPart, imagePart));
            Map<String, Object> generationConfig = Map.of(
                    "temperature", 0.2,
                    "responseMimeType", "application/json"
            );

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(content),
                    "generationConfig", generationConfig
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("Sending image to AI Vision endpoint for recognition...");
            ResponseEntity<String> response = restTemplate.postForEntity(requestUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseGeminiResponse(response.getBody());
            } else {
                return RecognitionResponse.error("AI_API_ERROR", "AI service responded with status " + response.getStatusCode());
            }

        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden ex) {
            log.error("AI Vision API authorization failed: {}", ex.getMessage());
            return RecognitionResponse.error("AI_AUTH_FAILED", "AI Vision API key is unauthorized or invalid. Please check your AI_VISION_API_KEY configuration.");
        } catch (HttpClientErrorException.TooManyRequests ex) {
            log.warn("AI Vision API rate limit exceeded: {}", ex.getMessage());
            return RecognitionResponse.error("AI_RATE_LIMITED", "AI Vision API rate limit reached. Please retry in a few moments.");
        } catch (IOException ex) {
            log.error("Failed to read image file bytes: {}", ex.getMessage());
            throw new ApiException("Failed to process image file: " + ex.getMessage(), HttpStatus.BAD_REQUEST, "IMAGE_READ_ERROR");
        } catch (Exception ex) {
            log.error("Unexpected error during AI food recognition: {}", ex.getMessage(), ex);
            return RecognitionResponse.error("AI_RECOGNITION_ERROR", "Food recognition failed: " + ex.getMessage());
        }
    }

    private RecognitionResponse parseGeminiResponse(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");

            if (textNode.isMissingNode() || textNode.asText().trim().isEmpty()) {
                return RecognitionResponse.error("EMPTY_AI_RESPONSE", "No response text was returned by the AI vision model.");
            }

            String rawText = textNode.asText().trim();
            // Strip any accidental markdown formatting
            if (rawText.startsWith("```json")) {
                rawText = rawText.substring(7);
            } else if (rawText.startsWith("```")) {
                rawText = rawText.substring(3);
            }
            if (rawText.endsWith("```")) {
                rawText = rawText.substring(0, rawText.length() - 3);
            }
            rawText = rawText.trim();

            JsonNode parsed = objectMapper.readTree(rawText);
            String primaryFood = parsed.path("primaryFood").asText("Unrecognized Food");
            double confidence = parsed.path("confidence").asDouble(0.85);

            List<FoodCandidate> candidates = new ArrayList<>();
            JsonNode candidatesArray = parsed.path("candidates");
            if (candidatesArray.isArray()) {
                for (JsonNode cNode : candidatesArray) {
                    candidates.add(new FoodCandidate(
                            cNode.path("name").asText(""),
                            cNode.path("confidence").asDouble(0.8),
                            cNode.path("category").asText("Food"),
                            cNode.path("description").asText("")
                    ));
                }
            }

            if (candidates.isEmpty()) {
                candidates.add(new FoodCandidate(primaryFood, confidence, "Primary", "Detected dish"));
            }

            return RecognitionResponse.success(primaryFood, confidence, candidates);

        } catch (Exception ex) {
            log.error("Failed to parse AI vision output: {}", ex.getMessage());
            return RecognitionResponse.error("PARSE_ERROR", "Could not parse AI vision response structure.");
        }
    }
}
