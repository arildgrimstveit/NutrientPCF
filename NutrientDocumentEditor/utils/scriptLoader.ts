/**
 * Utility for dynamically loading the Nutrient Web SDK script
 */

/**
 * Dynamically loads the Nutrient Viewer script if not already loaded
 * @returns Promise that resolves when the script is loaded and API is available
 */
export const loadNutrientScript = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // Check if script already exists and NutrientViewer is available
    if (document.getElementById("nutrient-sdk-script") && window.NutrientViewer) {
      resolve();
      return;
    }

    // Check if script exists but API is not ready yet
    if (document.getElementById("nutrient-sdk-script")) {
      // Wait a bit for the API to become available
      const checkAPI = () => {
        if (window.NutrientViewer) {
          resolve();
        } else {
          setTimeout(checkAPI, 100);
        }
      };
      checkAPI();
      return;
    }

    const script = document.createElement("script");
    script.id = "nutrient-sdk-script";
    script.src =
      "https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.4.0/nutrient-viewer.js";
    script.async = true;
    script.onload = () => {
      // Wait for the API to become available
      const checkAPI = () => {
        if (window.NutrientViewer) {
          resolve();
        } else {
          setTimeout(checkAPI, 100);
        }
      };
      checkAPI();
    };
    script.onerror = () =>
      reject(new Error("Failed to load NutrientViewer script"));
    document.body.appendChild(script);
  });
};

