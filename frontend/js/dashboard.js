/**
 * NutriVision AI - Dashboard & Chart.js Visualizer (js/dashboard.js)
 * Manages responsive Chart.js instances, metric cards, FDA nutrition label, and daily meal diary.
 */

class NutriDashboard {
  constructor() {
    this.macroChart = null;
    this.microChart = null;
    this.currentAnalysis = null;
  }

  /**
   * Initializes or updates dashboard with new NutritionAnalysisResult data.
   */
  renderDashboard(data) {
    if (!data) return;
    this.currentAnalysis = data;

    // 1. Reveal dashboard container if hidden
    const container = document.getElementById('dashboardContainer');
    if (container) {
      container.style.display = 'flex';
      // Smooth scroll into view
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 2. Update Metric Cards
    this.updateMetricCards(data);

    // 3. Render / Update Chart.js Charts
    this.renderMacroChart(data);
    this.renderMicroChart(data);

    // 4. Update FDA Nutrition Facts Panel
    this.updateFdaLabel(data);

    // 5. Update Data Source & Quality Notice
    this.updateDataNotice(data);

    // 6. Refresh Daily Diary view
    this.renderDiary();
  }

  /**
   * Updates all 7 summary metric cards
   */
  updateMetricCards(data) {
    const safeVal = (v, fallback = '—') => (v !== null && v !== undefined ? v : fallback);
    const safeDv = (k) => (data.percentDailyValues && data.percentDailyValues[k] !== undefined ? `${data.percentDailyValues[k]}% DV` : '—');
    const safeDvPct = (k) => (data.percentDailyValues && data.percentDailyValues[k] !== undefined ? Math.min(data.percentDailyValues[k], 100) : 0);

    // Calories
    this.setText('metricCalories', safeVal(data.calories));
    this.setText('dvCaloriesText', safeDv('calories'));
    this.setWidth('dvCaloriesFill', `${safeDvPct('calories')}%`);

    // Protein
    this.setText('metricProtein', safeVal(data.protein));
    this.setText('dvProteinText', safeDv('protein'));
    this.setWidth('dvProteinFill', `${safeDvPct('protein')}%`);

    // Carbohydrates
    this.setText('metricCarbs', safeVal(data.carbohydrates));
    this.setText('dvCarbsText', safeDv('carbohydrates'));
    this.setWidth('dvCarbsFill', `${safeDvPct('carbohydrates')}%`);

    // Fat
    this.setText('metricFat', safeVal(data.fat));
    this.setText('dvFatText', safeDv('fat'));
    this.setWidth('dvFatFill', `${safeDvPct('fat')}%`);

    // Fiber
    this.setText('metricFiber', safeVal(data.fiber));
    this.setText('dvFiberText', safeDv('fiber'));
    this.setWidth('dvFiberFill', `${safeDvPct('fiber')}%`);

    // Sugar
    this.setText('metricSugar', safeVal(data.sugar));
    this.setText('dvSugarText', safeDv('sugar'));
    this.setWidth('dvSugarFill', `${safeDvPct('sugar')}%`);

    // Sodium
    this.setText('metricSodium', safeVal(data.sodium));
    this.setText('dvSodiumText', safeDv('sodium'));
    this.setWidth('dvSodiumFill', `${safeDvPct('sodium')}%`);
  }

  /**
   * Renders Macronutrient Calorie Breakdown Doughnut Chart
   */
  renderMacroChart(data) {
    const canvas = document.getElementById('macroDoughnutChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const dist = data.macroDistribution || { proteinPercent: 0, carbPercent: 0, fatPercent: 0, proteinCalories: 0, carbCalories: 0, fatCalories: 0 };

    if (this.macroChart) {
      this.macroChart.destroy();
    }

    this.macroChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [
          `Protein (${dist.proteinPercent}%)`,
          `Carbohydrates (${dist.carbPercent}%)`,
          `Fat (${dist.fatPercent}%)`
        ],
        datasets: [{
          data: [dist.proteinCalories || 0, dist.carbCalories || 0, dist.fatCalories || 0],
          backgroundColor: ['#059669', '#3b82f6', '#ef4444'],
          hoverBackgroundColor: ['#047857', '#2563eb', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 14,
              font: { family: 'Inter', size: 12, weight: 600 },
              padding: 16
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const val = context.raw || 0;
                return ` ${label}: ${val} kcal`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  /**
   * Renders Micronutrients & Minerals Bar Chart (% Daily Value)
   */
  renderMicroChart(data) {
    const canvas = document.getElementById('microBarChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const dvs = data.percentDailyValues || {};

    const labels = ['Dietary Fiber', 'Sodium', 'Calcium', 'Iron', 'Potassium'];
    const values = [
      dvs.fiber || 0,
      dvs.sodium || 0,
      dvs.calcium || 0,
      dvs.iron || 0,
      dvs.potassium || 0
    ];

    if (this.microChart) {
      this.microChart.destroy();
    }

    this.microChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '% Daily Value (DV)',
          data: values,
          backgroundColor: [
            'rgba(139, 92, 246, 0.85)',
            'rgba(99, 102, 241, 0.85)',
            'rgba(14, 165, 233, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(16, 185, 129, 0.85)'
          ],
          borderColor: [
            '#8b5cf6',
            '#6366f1',
            '#0ea5e9',
            '#f59e0b',
            '#10b981'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: '% Daily Value', font: { family: 'Inter', size: 11, weight: 600 } },
            ticks: {
              callback: (value) => `${value}%`
            },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11, weight: 600 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.raw}% of recommended daily value`
            }
          }
        }
      }
    });
  }

  /**
   * Updates standard FDA Nutrition Facts Label
   */
  updateFdaLabel(data) {
    this.setText('fdaFoodName', data.foodName || 'Food Item');
    this.setText('fdaServingGrams', `${data.quantityGrams}g`);
    this.setText('fdaCalories', data.calories !== null ? Math.round(data.calories) : '—');

    const formatRow = (val, unit, dvKey) => {
      const vText = val !== null && val !== undefined ? `${val}${unit}` : 'Not listed';
      const dvText = data.percentDailyValues && data.percentDailyValues[dvKey] !== undefined ? `${data.percentDailyValues[dvKey]}%` : '—';
      return { vText, dvText };
    };

    // Fat
    const fatInfo = formatRow(data.fat, 'g', 'fat');
    this.setText('fdaFatVal', fatInfo.vText);
    this.setText('fdaFatDv', fatInfo.dvText);

    // Sodium
    const sodInfo = formatRow(data.sodium, 'mg', 'sodium');
    this.setText('fdaSodiumVal', sodInfo.vText);
    this.setText('fdaSodiumDv', sodInfo.dvText);

    // Carbs
    const carbInfo = formatRow(data.carbohydrates, 'g', 'carbohydrates');
    this.setText('fdaCarbVal', carbInfo.vText);
    this.setText('fdaCarbDv', carbInfo.dvText);

    // Fiber
    const fibInfo = formatRow(data.fiber, 'g', 'fiber');
    this.setText('fdaFiberVal', fibInfo.vText);
    this.setText('fdaFiberDv', fibInfo.dvText);

    // Sugar
    const sugInfo = formatRow(data.sugar, 'g', 'sugar');
    this.setText('fdaSugarVal', sugInfo.vText);

    // Protein
    const proInfo = formatRow(data.protein, 'g', 'protein');
    this.setText('fdaProteinVal', proInfo.vText);
    this.setText('fdaProteinDv', proInfo.dvText);
  }

  /**
   * Updates Data Source and alerts for missing nutrient data
   */
  updateDataNotice(data) {
    this.setText('dataSourceLabel', data.dataSource || 'USDA FoodData Central');

    const missingBox = document.getElementById('missingNutrientsBox');
    const pillsWrap = document.getElementById('missingNutrientPills');

    if (missingBox && pillsWrap) {
      if (data.missingNutrients && data.missingNutrients.length > 0) {
        missingBox.style.display = 'block';
        pillsWrap.innerHTML = data.missingNutrients
          .map((n) => `<span class="missing-pill">⚠️ Missing: ${n}</span>`)
          .join('');
      } else {
        missingBox.style.display = 'none';
        pillsWrap.innerHTML = '';
      }
    }
  }

  /**
   * Saves current food analysis into Daily Meal Diary (localStorage)
   */
  logCurrentMeal() {
    if (!this.currentAnalysis) {
      alert('Please analyze a food item first.');
      return;
    }

    const item = {
      id: Date.now(),
      foodName: this.currentAnalysis.foodName,
      quantityGrams: this.currentAnalysis.quantityGrams,
      calories: this.currentAnalysis.calories || 0,
      protein: this.currentAnalysis.protein || 0,
      carbohydrates: this.currentAnalysis.carbohydrates || 0,
      fat: this.currentAnalysis.fat || 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const diary = this.getDiary();
    diary.push(item);
    localStorage.setItem('nutrivision_daily_diary', JSON.stringify(diary));

    this.renderDiary();
    alert(`Logged ${item.foodName} (${item.quantityGrams}g) to Daily Meal Diary!`);
  }

  getDiary() {
    try {
      const saved = localStorage.getItem('nutrivision_daily_diary');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  clearDiary() {
    if (confirm('Are you sure you want to clear your daily meal log?')) {
      localStorage.removeItem('nutrivision_daily_diary');
      this.renderDiary();
    }
  }

  renderDiary() {
    const tableBody = document.getElementById('diaryTableBody');
    const totalsRow = document.getElementById('diaryTotalsRow');
    if (!tableBody) return;

    const diary = this.getDiary();

    if (diary.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No meals logged today yet. Click "Log to Daily Diary" above to add meals.</td></tr>`;
      if (totalsRow) totalsRow.style.display = 'none';
      return;
    }

    let totCal = 0, totPro = 0, totCarb = 0, totFat = 0;

    tableBody.innerHTML = diary
      .map((entry) => {
        totCal += entry.calories;
        totPro += entry.protein;
        totCarb += entry.carbohydrates;
        totFat += entry.fat;
        return `
          <tr>
            <td><strong>${entry.foodName}</strong></td>
            <td>${entry.quantityGrams}g</td>
            <td>${Math.round(entry.calories)} kcal</td>
            <td>${Math.round(entry.protein * 10) / 10}g</td>
            <td>${Math.round(entry.carbohydrates * 10) / 10}g</td>
            <td>${Math.round(entry.fat * 10) / 10}g</td>
          </tr>
        `;
      })
      .join('');

    if (totalsRow) {
      totalsRow.style.display = 'table-row';
      this.setText('diaryTotalCalories', `${Math.round(totCal)} kcal`);
      this.setText('diaryTotalProtein', `${Math.round(totPro * 10) / 10}g`);
      this.setText('diaryTotalCarbs', `${Math.round(totCarb * 10) / 10}g`);
      this.setText('diaryTotalFat', `${Math.round(totFat * 10) / 10}g`);
    }
  }

  exportJson() {
    if (!this.currentAnalysis) {
      alert('No analysis data to export.');
      return;
    }

    const jsonStr = JSON.stringify(this.currentAnalysis, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrivision-${this.currentAnalysis.foodName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  setWidth(id, val) {
    const el = document.getElementById(id);
    if (el) el.style.width = val;
  }
}

// Singleton export
window.nutriDashboard = new NutriDashboard();
