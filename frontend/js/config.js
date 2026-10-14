/**
 * NutriVision AI - Frontend Configuration
 *
 * NOTE: API_BASE_URL auto-resolves to window.location.origin on Vercel and local dev.
 * You can also set DEFAULT_API_BASE_URL if pointing to an external backend.
 * Never put private API keys here — all private keys belong in backend environment variables.
 */

const API_CONFIG = {
  // Default placeholder backend domain (replaced with deployed Java backend URL in production)
  DEFAULT_API_BASE_URL: "https://YOUR-BACKEND-DOMAIN.com",

  /**
   * Returns active backend URL.
   * On localhost/127.0.0.1, automatically resolves to window.location.origin so local testing works out of the box!
   */
  getBaseUrl() {
    const saved = localStorage.getItem("nutrivision_custom_backend_url");
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, "");
    }
    // If an explicit non-placeholder custom domain was configured
    if (this.DEFAULT_API_BASE_URL && !this.DEFAULT_API_BASE_URL.includes("YOUR-BACKEND-DOMAIN.com")) {
      return this.DEFAULT_API_BASE_URL.replace(/\/+$/, "");
    }
    // Automatically use current origin in browser (Vercel serverless, localhost, or custom domain)
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin;
    }
    return "";
  },

  /**
   * Sets custom backend URL in localStorage for live development or testing.
   */
  setBaseUrl(url) {
    if (url && url.trim()) {
      localStorage.setItem("nutrivision_custom_backend_url", url.trim().replace(/\/+$/, ""));
    } else {
      localStorage.removeItem("nutrivision_custom_backend_url");
    }
  },

  /**
   * Checks if current URL is still the default placeholder.
   */
  isPlaceholder() {
    return this.getBaseUrl().includes("YOUR-BACKEND-DOMAIN.com");
  },

  getAiApiKey() {
    return localStorage.getItem("nutrivision_gemini_api_key") || "";
  },

  setAiApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem("nutrivision_gemini_api_key", key.trim());
    } else {
      localStorage.removeItem("nutrivision_gemini_api_key");
    }
  }
};

// Global constant matching requirement
const API_BASE_URL = API_CONFIG.getBaseUrl();
