const { setCorsHeaders } = require('../reference-foods');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (_) {
      payload = {};
    }
  }

  if (!payload || typeof payload !== 'object') {
    payload = await new Promise((resolve) => {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch (_) { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  }

  try {
    const grams = Number(payload.quantityGrams) || 100;
    const per100g = payload.per100g || {};
    const factor = grams / 100.0;

    const scale = (val) => (val !== undefined && val !== null ? Math.round(val * factor * 10) / 10 : null);

    const calories = scale(per100g.calories);
    const protein = scale(per100g.protein);
    const carbs = scale(per100g.carbohydrates !== undefined && per100g.carbohydrates !== null ? per100g.carbohydrates : per100g.carbs);
    const fat = scale(per100g.fat);
    const fiber = scale(per100g.fiber);
    const sugar = scale(per100g.sugar !== undefined && per100g.sugar !== null ? per100g.sugar : per100g.sugars);
    const sodium = scale(per100g.sodium);
    const calcium = scale(per100g.calcium);
    const iron = scale(per100g.iron);
    const potassium = scale(per100g.potassium);

    // Macro calorie distribution
    const pCal = Math.round((protein || 0) * 4 * 10) / 10;
    const cCal = Math.round((carbs || 0) * 4 * 10) / 10;
    const fCal = Math.round((fat || 0) * 9 * 10) / 10;
    const totalMacroCal = pCal + cCal + fCal;

    const macroDistribution = {
      proteinCalories: pCal,
      carbCalories: cCal,
      fatCalories: fCal,
      proteinPercent: totalMacroCal > 0 ? Math.round((pCal / totalMacroCal) * 1000) / 10 : 0,
      carbPercent: totalMacroCal > 0 ? Math.round((cCal / totalMacroCal) * 1000) / 10 : 0,
      fatPercent: totalMacroCal > 0 ? Math.round((fCal / totalMacroCal) * 1000) / 10 : 0
    };

    // FDA Daily Values (2000 kcal diet)
    const percentDailyValues = {
      calories: calories !== null ? Math.round((calories / 2000.0) * 1000) / 10 : 0,
      protein: protein !== null ? Math.round((protein / 50.0) * 1000) / 10 : 0,
      carbohydrates: carbs !== null ? Math.round((carbs / 275.0) * 1000) / 10 : 0,
      fat: fat !== null ? Math.round((fat / 78.0) * 1000) / 10 : 0,
      fiber: fiber !== null ? Math.round((fiber / 28.0) * 1000) / 10 : 0,
      sugar: sugar !== null ? Math.round((sugar / 50.0) * 1000) / 10 : 0,
      sodium: sodium !== null ? Math.round((sodium / 2300.0) * 1000) / 10 : 0
    };

    const result = {
      fdcId: payload.fdcId,
      foodName: payload.foodName,
      quantityGrams: grams,
      calories,
      protein,
      carbohydrates: carbs,
      fat,
      fiber,
      sugar,
      sodium,
      macroDistribution,
      percentDailyValues,
      detailedNutrients: [
        { nutrientId: 1008, nutrientName: "Calories (Energy)", value: calories, unitName: "kcal", percentDailyValue: percentDailyValues.calories },
        { nutrientId: 1003, nutrientName: "Protein", value: protein, unitName: "g", percentDailyValue: percentDailyValues.protein },
        { nutrientId: 1005, nutrientName: "Total Carbohydrate", value: carbs, unitName: "g", percentDailyValue: percentDailyValues.carbohydrates },
        { nutrientId: 1004, nutrientName: "Total Fat", value: fat, unitName: "g", percentDailyValue: percentDailyValues.fat },
        { nutrientId: 1079, nutrientName: "Dietary Fiber", value: fiber, unitName: "g", percentDailyValue: percentDailyValues.fiber },
        { nutrientId: 2000, nutrientName: "Total Sugars", value: sugar, unitName: "g", percentDailyValue: percentDailyValues.sugar },
        { nutrientId: 1093, nutrientName: "Sodium", value: sodium, unitName: "mg", percentDailyValue: percentDailyValues.sodium }
      ],
      missingNutrients: [],
      dataSource: payload.fdcId ? "USDA FoodData Central" : "Standard Reference Database",
      isEstimated: false,
      calculationFormula: `Calculated nutrient = nutrient per 100g × ${grams}g / 100`
    };

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'CALC_ERROR', message: err.message });
  }
};
