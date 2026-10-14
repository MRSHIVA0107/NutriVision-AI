package com.nutrivision.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UsdaSearchResponse {

    private Integer totalHits;
    private Integer currentPage;
    private Integer totalPages;
    private List<UsdaFoodItem> foods;

    public UsdaSearchResponse() {
    }

    public Integer getTotalHits() {
        return totalHits;
    }

    public void setTotalHits(Integer totalHits) {
        this.totalHits = totalHits;
    }

    public Integer getCurrentPage() {
        return currentPage;
    }

    public void setCurrentPage(Integer currentPage) {
        this.currentPage = currentPage;
    }

    public Integer getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(Integer totalPages) {
        this.totalPages = totalPages;
    }

    public List<UsdaFoodItem> getFoods() {
        return foods;
    }

    public void setFoods(List<UsdaFoodItem> foods) {
        this.foods = foods;
    }
}
