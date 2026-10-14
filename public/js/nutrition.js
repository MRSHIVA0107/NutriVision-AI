/**
 * NutriVision AI - Nutrition API & Calculation Engine (js/nutrition.js)
 * Handles communication with backend REST endpoints (Vercel Serverless / Node.js) and executes nutrient scaling formulas.
 */

class NutriNutrition {
  constructor() {
    this.dvStandards = {
      calories: 2000.0,
      protein: 50.0,
      carbohydrates: 275.0,
      fat: 78.0,
      fiber: 28.0,
      sugar: 50.0,
      sodium: 2300.0,
      calcium: 1300.0,
      iron: 18.0,
      potassium: 4700.0
    };
  }

  /**
   * Health status check against backend
   */
  async checkBackendHealth() {
    const url = `${API_CONFIG.getBaseUrl()}/api/health`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        return await response.json();
      }
      return { status: 'DEGRADED', httpCode: response.status };
    } catch (err) {
      return { status: 'UNREACHABLE', error: err.message };
    }
  }

  /**
   * Sends image file to backend AI food recognition endpoint.
   */
  async recognizeFood(file) {
    if (!file) {
      throw new Error('Please select or capture a food image first.');
    }

    const url = `${API_CONFIG.getBaseUrl()}/api/food/recognize`;
    const formData = new FormData();
    formData.append('file', file);

    const headers = { 'Accept': 'application/json' };
    const aiKey = API_CONFIG.getAiApiKey();
    if (aiKey) {
      headers['X-AI-Api-Key'] = aiKey;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: headers,
        signal: AbortSignal.timeout(20000)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `Server responded with status ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.errorCode = data.error || data.errorCode;
        throw err;
      }

      return data;
    } catch (err) {
      if (err.name === 'TimeoutError') {
        throw new Error('The AI recognition request timed out. Please verify your backend server is responding.');
      }
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error(`Unable to connect to the backend at ${API_CONFIG.getBaseUrl()}. Please ensure the backend service is running.`);
      }
      throw err;
    }
  }

  /**
   * Search USDA FoodData Central database through backend
   */
  async searchFoods(query, pageSize = 5) {
    if (!query || !query.trim()) {
      return [];
    }

    const trimmed = encodeURIComponent(query.trim());
    const url = `${API_CONFIG.getBaseUrl()}/api/nutrition/search?query=${trimmed}&pageSize=${pageSize}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        const errorMsg = data.message || `USDA Search failed with status ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.errorCode = data.error;
        throw err;
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error(`Backend unavailable at ${API_CONFIG.getBaseUrl()}. Check your backend connection.`);
      }
      throw err;
    }
  }

  /**
   * Calculate nutrients via backend endpoint
   */
  async calculateNutritionOnBackend(payload) {
    const url = `${API_CONFIG.getBaseUrl()}/api/nutrition/calculate`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Calculation failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      // Fallback to client-side calculation using exact same formula
      if (payload.per100g) {
        return this.calculateClientSide(payload.foodName, payload.quantityGrams, payload.per100g, payload.fdcId);
      }
      throw err;
    }
  }

  /**
   * Client-side nutrient scaling formula implementation:
   * Calculated nutrient = nutrient per 100g × quantity in grams / 100
   */
  calculateClientSide(foodName, quantityGrams, per100g, fdcId = null) {
    const grams = Number(quantityGrams) || 100;
    const factor = grams / 100.0;

    const scale = (val) => (val !== undefined && val !== null ? Math.round(val * factor * 10) / 10 : null);

    const calories = scale(per100g.calories);
    const protein = scale(per100g.protein);
    const carbohydrates = scale(per100g.carbohydrates || per100g.carbs);
    const fat = scale(per100g.fat);
    const fiber = scale(per100g.fiber);
    const sugar = scale(per100g.sugar || per100g.sugars);
    const sodium = scale(per100g.sodium);
    const calcium = scale(per100g.calcium);
    const iron = scale(per100g.iron);
    const potassium = scale(per100g.potassium);

    // Identify missing nutrients
    const missingNutrients = [];
    if (calories === null) missingNutrients.push('Calories');
    if (protein === null) missingNutrients.push('Protein');
    if (carbohydrates === null) missingNutrients.push('Carbohydrates');
    if (fat === null) missingNutrients.push('Fat');
    if (fiber === null) missingNutrients.push('Dietary Fiber');
    if (sugar === null) missingNutrients.push('Sugars');
    if (sodium === null) missingNutrients.push('Sodium');

    // Macro calorie distribution
    const proteinCal = Math.round((protein || 0) * 4 * 10) / 10;
    const carbCal = Math.round((carbohydrates || 0) * 4 * 10) / 10;
    const fatCal = Math.round((fat || 0) * 9 * 10) / 10;
    const totalMacroCal = proteinCal + carbCal + fatCal;

    const macroDistribution = {
      proteinCalories: proteinCal,
      carbCalories: carbCal,
      fatCalories: fatCal,
      proteinPercent: totalMacroCal > 0 ? Math.round((proteinCal / totalMacroCal) * 1000) / 10 : 0,
      carbPercent: totalMacroCal > 0 ? Math.round((carbCal / totalMacroCal) * 1000) / 10 : 0,
      fatPercent: totalMacroCal > 0 ? Math.round((fatCal / totalMacroCal) * 1000) / 10 : 0
    };

    // % Daily Values
    const percentDailyValues = {
      calories: calories !== null ? Math.round((calories / this.dvStandards.calories) * 1000) / 10 : 0,
      protein: protein !== null ? Math.round((protein / this.dvStandards.protein) * 1000) / 10 : 0,
      carbohydrates: carbohydrates !== null ? Math.round((carbohydrates / this.dvStandards.carbohydrates) * 1000) / 10 : 0,
      fat: fat !== null ? Math.round((fat / this.dvStandards.fat) * 1000) / 10 : 0,
      fiber: fiber !== null ? Math.round((fiber / this.dvStandards.fiber) * 1000) / 10 : 0,
      sugar: sugar !== null ? Math.round((sugar / this.dvStandards.sugar) * 1000) / 10 : 0,
      sodium: sodium !== null ? Math.round((sodium / this.dvStandards.sodium) * 1000) / 10 : 0,
      calcium: calcium !== null ? Math.round((calcium / this.dvStandards.calcium) * 1000) / 10 : 0,
      iron: iron !== null ? Math.round((iron / this.dvStandards.iron) * 1000) / 10 : 0,
      potassium: potassium !== null ? Math.round((potassium / this.dvStandards.potassium) * 1000) / 10 : 0
    };

    const detailedNutrients = [
      { nutrientId: 1008, nutrientName: 'Calories (Energy)', value: calories, unitName: 'kcal', percentDailyValue: percentDailyValues.calories },
      { nutrientId: 1003, nutrientName: 'Protein', value: protein, unitName: 'g', percentDailyValue: percentDailyValues.protein },
      { nutrientId: 1005, nutrientName: 'Total Carbohydrate', value: carbohydrates, unitName: 'g', percentDailyValue: percentDailyValues.carbohydrates },
      { nutrientId: 1004, nutrientName: 'Total Fat', value: fat, unitName: 'g', percentDailyValue: percentDailyValues.fat },
      { nutrientId: 1079, nutrientName: 'Dietary Fiber', value: fiber, unitName: 'g', percentDailyValue: percentDailyValues.fiber },
      { nutrientId: 2000, nutrientName: 'Total Sugars', value: sugar, unitName: 'g', percentDailyValue: percentDailyValues.sugar },
      { nutrientId: 1093, nutrientName: 'Sodium', value: sodium, unitName: 'mg', percentDailyValue: percentDailyValues.sodium }
    ];

    if (calcium !== null) detailedNutrients.push({ nutrientId: 1087, nutrientName: 'Calcium', value: calcium, unitName: 'mg', percentDailyValue: percentDailyValues.calcium });
    if (iron !== null) detailedNutrients.push({ nutrientId: 1089, nutrientName: 'Iron', value: iron, unitName: 'mg', percentDailyValue: percentDailyValues.iron });
    if (potassium !== null) detailedNutrients.push({ nutrientId: 1092, nutrientName: 'Potassium', value: potassium, unitName: 'mg', percentDailyValue: percentDailyValues.potassium });

    return {
      fdcId,
      foodName,
      quantityGrams: grams,
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      sugar,
      sodium,
      macroDistribution,
      percentDailyValues,
      detailedNutrients,
      missingNutrients,
      dataSource: fdcId ? 'USDA FoodData Central' : 'Reference Nutrition Data',
      isEstimated: false,
      calculationFormula: `Calculated nutrient = nutrient per 100g × ${grams}g / 100`
    };
  }
}

// Singleton export
window.nutriNutrition = new NutriNutrition();
