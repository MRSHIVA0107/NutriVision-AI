/**
 * NutriVision AI - Main Application Coordinator (js/app.js)
 * Coordinates file upload, live camera feed, AI recognition flow, USDA lookups, and UI state.
 */

document.addEventListener('DOMContentLoaded', () => {
  NutriApp.init();
});

const NutriApp = {
  activeFile: null,
  activeFoodItem: null,
  activeGrams: 150,
  currentTab: 'upload', // 'upload' or 'camera'

  init() {
    this.bindNavigation();
    this.bindDropzone();
    this.bindCameraControls();
    this.bindAnalysisAction();
    this.bindPortionControls();
    this.bindSearchAndCorrection();
    this.bindDiaryControls();
    this.bindBackendSettingsModal();
    this.checkHealthStatus();
  },

  /* ==========================================================================
     Navigation & Backend Health Status
     ========================================================================== */
  bindNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
      });
    }
  },

  async checkHealthStatus() {
    const pill = document.getElementById('backendStatusPill');
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    if (!pill || !dot || !text) return;

    if (API_CONFIG.isPlaceholder()) {
      dot.className = 'status-dot warning';
      text.textContent = 'Backend: Config Required';
      pill.title = 'Current URL is the default placeholder. Click to configure your deployed backend URL.';
      return;
    }

    try {
      const res = await window.nutriNutrition.checkBackendHealth();
      if (res && res.status === 'UP') {
        dot.className = 'status-dot connected';
        text.textContent = 'Backend: Connected';
        pill.title = `Connected to ${API_CONFIG.getBaseUrl()}`;
      } else {
        dot.className = 'status-dot warning';
        text.textContent = 'Backend: Offline';
        pill.title = `Backend at ${API_CONFIG.getBaseUrl()} is currently unreachable.`;
      }
    } catch {
      dot.className = 'status-dot error';
      text.textContent = 'Backend: Disconnected';
    }
  },

  /* ==========================================================================
     File Drag-and-Drop & File Picker
     ========================================================================== */
  bindDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const replaceBtn = document.getElementById('replaceImgBtn');
    const removeBtn = document.getElementById('removeImgBtn');

    if (!dropzone || !fileInput) return;

    // Click to open file picker
    dropzone.addEventListener('click', (e) => {
      if (e.target !== browseBtn) {
        fileInput.click();
      }
    });

    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // Drag-and-drop events
    ['dragenter', 'dragover'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.handleFileSelected(files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.handleFileSelected(fileInput.files[0]);
      }
    });

    // Replace / Remove buttons
    if (replaceBtn) {
      replaceBtn.addEventListener('click', () => fileInput.click());
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => this.clearImageSelection());
    }
  },

  handleFileSelected(file) {
    // Format check: JPG, JPEG, PNG, WebP
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      alert('Please upload a valid image file (JPG, JPEG, PNG, or WebP).');
      return;
    }

    // Size limit: 15MB
    if (file.size > 15 * 1024 * 1024) {
      alert('File exceeds the 15MB size limit. Please choose a smaller image.');
      return;
    }

    this.activeFile = file;

    // Render image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.displayPreview(e.target.result, file.name, (file.size / 1024).toFixed(1) + ' KB');
    };
    reader.readAsDataURL(file);
  },

  displayPreview(dataUrl, name, sizeStr) {
    const dropzone = document.getElementById('dropzone');
    const previewWrap = document.getElementById('previewContainer');
    const previewImg = document.getElementById('previewImg');
    const metaText = document.getElementById('previewMetaText');
    const analyzeBtn = document.getElementById('analyzeBtn');

    if (dropzone) dropzone.style.display = 'none';
    if (previewWrap) previewWrap.classList.add('active');
    if (previewImg) previewImg.src = dataUrl;
    if (metaText) metaText.textContent = `${name} (${sizeStr})`;
    if (analyzeBtn) analyzeBtn.disabled = false;
  },

  clearImageSelection() {
    this.activeFile = null;
    const dropzone = document.getElementById('dropzone');
    const previewWrap = document.getElementById('previewContainer');
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');

    if (fileInput) fileInput.value = '';
    if (previewWrap) previewWrap.classList.remove('active');
    if (dropzone) dropzone.style.display = 'flex';
    if (analyzeBtn) analyzeBtn.disabled = true;
  },

  /* ==========================================================================
     Live Camera Controls
     ========================================================================== */
  bindCameraControls() {
    const tabUpload = document.getElementById('tabUpload');
    const tabCamera = document.getElementById('tabCamera');
    const uploadArea = document.getElementById('uploadArea');
    const cameraContainer = document.getElementById('cameraContainer');

    const videoEl = document.getElementById('cameraFeed');
    const canvasEl = document.getElementById('cameraCanvas');
    const startCamBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('capturePhotoBtn');
    const retakeBtn = document.getElementById('retakePhotoBtn');
    const stopCamBtn = document.getElementById('stopCameraBtn');
    const switchCamBtn = document.getElementById('switchCameraBtn');

    if (tabUpload && tabCamera) {
      tabUpload.addEventListener('click', () => {
        tabUpload.classList.add('active');
        tabCamera.classList.remove('active');
        uploadArea.style.display = 'block';
        cameraContainer.classList.remove('active');
        window.nutriCamera.stopCamera(videoEl);
        this.currentTab = 'upload';
      });

      tabCamera.addEventListener('click', async () => {
        tabCamera.classList.add('active');
        tabUpload.classList.remove('active');
        uploadArea.style.display = 'none';
        cameraContainer.classList.add('active');
        this.currentTab = 'camera';

        // Auto start camera if supported
        try {
          await window.nutriCamera.startCamera(videoEl);
          if (startCamBtn) startCamBtn.style.display = 'none';
          if (captureBtn) captureBtn.style.display = 'inline-flex';
          if (stopCamBtn) stopCamBtn.style.display = 'inline-flex';
          if (switchCamBtn) switchCamBtn.style.display = 'inline-flex';
        } catch (err) {
          alert(err.message);
          if (startCamBtn) startCamBtn.style.display = 'inline-flex';
          if (captureBtn) captureBtn.style.display = 'none';
        }
      });
    }

    if (startCamBtn) {
      startCamBtn.addEventListener('click', async () => {
        try {
          await window.nutriCamera.startCamera(videoEl);
          startCamBtn.style.display = 'none';
          captureBtn.style.display = 'inline-flex';
          stopCamBtn.style.display = 'inline-flex';
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (captureBtn) {
      captureBtn.addEventListener('click', async () => {
        try {
          const { file, dataUrl } = await window.nutriCamera.capturePhoto(videoEl, canvasEl);
          this.activeFile = file;

          // Hide video, show snapshot
          window.nutriCamera.stopCamera(videoEl);
          captureBtn.style.display = 'none';
          if (retakeBtn) retakeBtn.style.display = 'inline-flex';

          this.displayPreview(dataUrl, file.name, (file.size / 1024).toFixed(1) + ' KB');
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (retakeBtn) {
      retakeBtn.addEventListener('click', async () => {
        retakeBtn.style.display = 'none';
        this.clearImageSelection();
        try {
          await window.nutriCamera.startCamera(videoEl);
          captureBtn.style.display = 'inline-flex';
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (stopCamBtn) {
      stopCamBtn.addEventListener('click', () => {
        window.nutriCamera.stopCamera(videoEl);
        if (startCamBtn) startCamBtn.style.display = 'inline-flex';
        if (captureBtn) captureBtn.style.display = 'none';
        if (stopCamBtn) stopCamBtn.style.display = 'none';
      });
    }

    if (switchCamBtn) {
      switchCamBtn.addEventListener('click', async () => {
        try {
          await window.nutriCamera.switchCamera(videoEl);
        } catch (err) {
          alert(err.message);
        }
      });
    }
  },

  /* ==========================================================================
     AI Food Recognition & Search Flow
     ========================================================================== */
  bindAnalysisAction() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;

    analyzeBtn.addEventListener('click', async () => {
      if (!this.activeFile) {
        alert('Please upload or capture a food photo first.');
        return;
      }

      this.setAnalyzeLoading(true);

      const aiAlert = document.getElementById('aiStatusNotice');
      if (aiAlert) aiAlert.style.display = 'none';

      try {
        const recognitionResult = await window.nutriNutrition.recognizeFood(this.activeFile);

        // Check if backend reported missing AI API key or service error
        if (!recognitionResult.success) {
          this.showAiNotice(
            recognitionResult.errorCode || 'AI_KEY_MISSING',
            recognitionResult.message || 'AI Vision service is not configured. Please use manual search below.'
          );
          // Highlight manual search input
          const searchInput = document.getElementById('foodSearchInput');
          if (searchInput) {
            searchInput.focus();
            searchInput.placeholder = 'Type food name here (e.g. Grilled Salmon)...';
          }
          return;
        }

        // Successfully recognized food
        this.handleRecognitionSuccess(recognitionResult);

      } catch (err) {
        this.showAiNotice(
          'REQUEST_FAILED',
          err.message || 'An error occurred while connecting to the food recognition service.'
        );
      } finally {
        this.setAnalyzeLoading(false);
      }
    });
  },

  setAnalyzeLoading(isLoading) {
    const btn = document.getElementById('analyzeBtn');
    const text = document.getElementById('analyzeBtnText');
    const spinner = document.getElementById('analyzeSpinner');

    if (!btn || !text || !spinner) return;

    btn.disabled = isLoading;
    if (isLoading) {
      spinner.style.display = 'inline-block';
      text.textContent = 'Analyzing Food with AI...';
    } else {
      spinner.style.display = 'none';
      text.textContent = 'Analyze Food with AI';
    }
  },

  showAiNotice(code, message) {
    const notice = document.getElementById('aiStatusNotice');
    const msgEl = document.getElementById('aiNoticeMessage');
    if (notice && msgEl) {
      notice.style.display = 'block';
      msgEl.textContent = message;
      notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  handleRecognitionSuccess(data) {
    const card = document.getElementById('aiResultsCard');
    const primaryName = document.getElementById('detectedFoodName');
    const confChip = document.getElementById('detectedConfidence');
    const pillsWrap = document.getElementById('candidatePills');

    if (card) card.style.display = 'flex';
    if (primaryName) primaryName.textContent = data.primaryFood || 'Detected Food';
    if (confChip) {
      const pct = Math.round((data.confidence || 0.9) * 100);
      confChip.textContent = `${pct}% Confidence`;
    }

    // Render candidate suggestions
    if (pillsWrap && data.candidates) {
      pillsWrap.innerHTML = data.candidates
        .map((c, idx) => {
          const cPct = Math.round((c.confidence || 0.8) * 100);
          return `<button type="button" class="candidate-pill ${idx === 0 ? 'selected' : ''}" data-name="${c.name}">${c.name} (${cPct}%)</button>`;
        })
        .join('');

      pillsWrap.querySelectorAll('.candidate-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          pillsWrap.querySelectorAll('.candidate-pill').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          const chosenName = btn.dataset.name;
          if (primaryName) primaryName.textContent = chosenName;
          this.queryAndCalculateUsda(chosenName);
        });
      });
    }

    // Automatically perform USDA query for the primary recognized food
    this.queryAndCalculateUsda(data.primaryFood);
  },

  /* ==========================================================================
     USDA Search & Correction Engine
     ========================================================================== */
  bindSearchAndCorrection() {
    const searchInput = document.getElementById('foodSearchInput');
    const searchBtn = document.getElementById('foodSearchBtn');
    const dropdown = document.getElementById('autocompleteList');

    if (!searchInput) return;

    let debounceTimer;

    // Debounced search on typing
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = searchInput.value.trim();
      if (query.length < 2) {
        if (dropdown) dropdown.classList.remove('active');
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const results = await window.nutriNutrition.searchFoods(query, 5);
          this.renderAutocompleteSuggestions(results);
        } catch {
          if (dropdown) dropdown.classList.remove('active');
        }
      }, 400);
    });

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
          this.queryAndCalculateUsda(query);
        }
      });
    }

    // Quick suggestion buttons
    document.querySelectorAll('.quick-food-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const searchVal = chip.dataset.search;
        if (searchInput) searchInput.value = searchVal;
        this.queryAndCalculateUsda(searchVal);
      });
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  },

  renderAutocompleteSuggestions(items) {
    const dropdown = document.getElementById('autocompleteList');
    if (!dropdown) return;

    if (!items || items.length === 0) {
      dropdown.classList.remove('active');
      return;
    }

    dropdown.innerHTML = items
      .map((item) => {
        const cat = item.foodCategory || item.dataType || 'USDA Item';
        return `
          <li class="autocomplete-item" data-fdcid="${item.fdcId}">
            <span>${item.description}</span>
            <small style="color: var(--text-muted); font-size: 0.75rem;">${cat}</small>
          </li>
        `;
      })
      .join('');

    dropdown.classList.add('active');

    dropdown.querySelectorAll('.autocomplete-item').forEach((li) => {
      li.addEventListener('click', () => {
        dropdown.classList.remove('active');
        const fdcId = parseInt(li.dataset.fdcid, 10);
        const item = items.find((i) => i.fdcId === fdcId);
        if (item) {
          const searchInput = document.getElementById('foodSearchInput');
          if (searchInput) searchInput.value = item.description;

          const primaryName = document.getElementById('detectedFoodName');
          if (primaryName) primaryName.textContent = item.description;

          this.selectUsdaItem(item);
        }
      });
    });
  },

  async queryAndCalculateUsda(foodName) {
    if (!foodName) return;

    try {
      const results = await window.nutriNutrition.searchFoods(foodName, 3);
      if (results && results.length > 0) {
        this.selectUsdaItem(results[0]);
      } else {
        // Fallback reference calculation if no USDA matches found
        const fallbackPer100g = {
          calories: 160.0,
          protein: 15.0,
          carbohydrates: 12.0,
          fat: 6.0,
          fiber: 2.0,
          sugar: 1.0,
          sodium: 80.0
        };
        const calc = window.nutriNutrition.calculateClientSide(foodName, this.activeGrams, fallbackPer100g);
        window.nutriDashboard.renderDashboard(calc);
      }
    } catch (err) {
      console.warn('USDA search error, computing fallback:', err);
      const fallbackPer100g = {
        calories: 150.0,
        protein: 10.0,
        carbohydrates: 15.0,
        fat: 5.0,
        fiber: 2.0,
        sugar: 1.0,
        sodium: 100.0
      };
      const calc = window.nutriNutrition.calculateClientSide(foodName, this.activeGrams, fallbackPer100g);
      window.nutriDashboard.renderDashboard(calc);
    }
  },

  selectUsdaItem(usdaItem) {
    this.activeFoodItem = usdaItem;
    this.recalculateCurrentPortion();
  },

  /* ==========================================================================
     Portion & Grams Scaler
     ========================================================================== */
  bindPortionControls() {
    const slider = document.getElementById('gramSlider');
    const numInput = document.getElementById('gramInput');
    const presetChips = document.querySelectorAll('.preset-chip');

    const updateGrams = (val) => {
      const g = Math.max(1, Math.min(1000, Number(val) || 100));
      this.activeGrams = g;
      if (slider) slider.value = g;
      if (numInput) numInput.value = g;

      presetChips.forEach((chip) => {
        if (Number(chip.dataset.grams) === g) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });

      this.recalculateCurrentPortion();
    };

    if (slider) {
      slider.addEventListener('input', (e) => updateGrams(e.target.value));
    }

    if (numInput) {
      numInput.addEventListener('change', (e) => updateGrams(e.target.value));
    }

    presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        updateGrams(chip.dataset.grams);
      });
    });
  },

  async recalculateCurrentPortion() {
    if (!this.activeFoodItem) return;

    const payload = {
      fdcId: this.activeFoodItem.fdcId,
      foodName: this.activeFoodItem.description,
      quantityGrams: this.activeGrams,
      per100g: this.activeFoodItem.nutrientsPer100g || {}
    };

    try {
      const result = await window.nutriNutrition.calculateNutritionOnBackend(payload);
      window.nutriDashboard.renderDashboard(result);
    } catch {
      const clientResult = window.nutriNutrition.calculateClientSide(
        this.activeFoodItem.description,
        this.activeGrams,
        this.activeFoodItem.nutrientsPer100g || {},
        this.activeFoodItem.fdcId
      );
      window.nutriDashboard.renderDashboard(clientResult);
    }
  },

  /* ==========================================================================
     Daily Diary Controls
     ========================================================================== */
  bindDiaryControls() {
    const logBtn = document.getElementById('logMealBtn');
    const clearBtn = document.getElementById('clearDiaryBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const printBtn = document.getElementById('printReportBtn');

    if (logBtn) {
      logBtn.addEventListener('click', () => window.nutriDashboard.logCurrentMeal());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => window.nutriDashboard.clearDiary());
    }

    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => window.nutriDashboard.exportJson());
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  },

  /* ==========================================================================
     Backend Settings Modal (Environment Configuration)
     ========================================================================== */
  bindBackendSettingsModal() {
    const pill = document.getElementById('backendStatusPill');
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const saveBtn = document.getElementById('saveBackendUrlBtn');
    const resetBtn = document.getElementById('resetBackendUrlBtn');
    const input = document.getElementById('backendUrlInput');
    const aiKeyInput = document.getElementById('aiApiKeyInput');

    if (!modal) return;

    if (pill) {
      pill.addEventListener('click', () => {
        if (input) input.value = API_CONFIG.getBaseUrl();
        if (aiKeyInput) aiKeyInput.value = API_CONFIG.getAiApiKey();
        modal.classList.add('active');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const val = input ? input.value.trim() : '';
        API_CONFIG.setBaseUrl(val);

        if (aiKeyInput) {
          API_CONFIG.setAiApiKey(aiKeyInput.value.trim());
        }

        modal.classList.remove('active');
        await this.checkHealthStatus();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        API_CONFIG.setBaseUrl(null);
        API_CONFIG.setAiApiKey(null);
        if (input) input.value = API_CONFIG.DEFAULT_API_BASE_URL;
        if (aiKeyInput) aiKeyInput.value = '';
        modal.classList.remove('active');
        await this.checkHealthStatus();
      });
    }
  }
};
