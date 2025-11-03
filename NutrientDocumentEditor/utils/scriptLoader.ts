/**
 * Utility for dynamically loading the Nutrient Web SDK script
 */

// Track if a script load is currently in progress
let scriptLoadPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Nutrient Viewer script if not already loaded
 * @param maxWaitMs - Maximum time to wait for API to become available (default: 30 seconds)
 * @returns Promise that resolves when the script is loaded and API is available
 */
export const loadNutrientScript = (maxWaitMs = 30000): Promise<void> => {
  // If script is already loaded and API is available, return immediately
  if (document.getElementById("nutrient-sdk-script") && window.NutrientViewer) {
    return Promise.resolve();
  }

  // If a load is already in progress, return that promise
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  // Start a new load
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const startTime = Date.now();

    // Helper function to check API availability with timeout
    const checkAPI = (intervalId?: NodeJS.Timeout) => {
      const elapsedTime = Date.now() - startTime;
      
      if (window.NutrientViewer) {
        if (intervalId) clearInterval(intervalId);
        scriptLoadPromise = null; // Clear the promise so future calls can check fresh
        resolve();
      } else if (elapsedTime > maxWaitMs) {
        if (intervalId) clearInterval(intervalId);
        const maxSeconds = Math.round(maxWaitMs / 1000);
        const errorMsg = `Timeout loading NutrientViewer API (waited ${maxSeconds}s). ` +
          `The script loaded but the API did not become available. ` +
          `This may be caused by network issues or firewall restrictions.`;
        console.error(errorMsg);
        scriptLoadPromise = null;
        reject(new Error(errorMsg));
      }
    };

    // Check if script element exists
    const existingScript = document.getElementById("nutrient-sdk-script");
    if (existingScript) {
      // Script tag exists but API not available - wait for it or timeout
      const intervalId = setInterval(() => checkAPI(intervalId), 500);
      checkAPI(intervalId);
      return;
    }

    // Create and load script
    const script = document.createElement("script");
    script.id = "nutrient-sdk-script";
    script.src = "https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.8.0/nutrient-viewer.js";
    script.async = true;
    
    script.onload = () => {
      const intervalId = setInterval(() => checkAPI(intervalId), 500);
      checkAPI(intervalId);
    };
    
    script.onerror = (event) => {
      const errorMsg = "Failed to load NutrientViewer script from CDN. " +
        "Check network connection and firewall settings. " +
        `URL: ${script.src}`;
      console.error(errorMsg, event);
      scriptLoadPromise = null;
      reject(new Error(errorMsg));
    };
    
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
};
