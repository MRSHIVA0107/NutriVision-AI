package com.nutrivision.controller;

import com.nutrivision.model.RecognitionResponse;
import com.nutrivision.service.FoodRecognitionService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/food")
public class FoodRecognitionController {

    private final FoodRecognitionService foodRecognitionService;

    public FoodRecognitionController(FoodRecognitionService foodRecognitionService) {
        this.foodRecognitionService = foodRecognitionService;
    }

    @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RecognitionResponse> recognizeFood(@RequestParam("file") MultipartFile file) {
        RecognitionResponse response = foodRecognitionService.recognizeFood(file);
        return ResponseEntity.ok(response);
    }
}
