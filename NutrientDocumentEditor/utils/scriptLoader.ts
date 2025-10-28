/**
 * Utility for dynamically loading the Nutrient Web SDK script
 */

/**
 * Dynamically loads the Nutrient Viewer script if not already loaded
 * @param maxWaitMs - Maximum time to wait for API to become available (default: 90 seconds for Dynamics)
 * @returns Promise that resolves when the script is loaded and API is available
 */
export const loadNutrientScript = (maxWaitMs = 90000): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();

    // Check if script already exists and NutrientViewer is available
    if (document.getElementById("nutrient-sdk-script") && window.NutrientViewer) {
      console.log("✓ NutrientViewer SDK already loaded and available");
      resolve();
      return;
    }

    // Helper function to check API availability with timeout
    const checkAPI = (intervalId?: NodeJS.Timeout) => {
      const elapsedTime = Date.now() - startTime;
      const elapsedSeconds = Math.round(elapsedTime / 1000);
      
      if (window.NutrientViewer) {
        if (intervalId) clearInterval(intervalId);
        console.log(`✓ NutrientViewer API became available after ${elapsedSeconds}s`);
        resolve();
      } else if (elapsedTime > maxWaitMs) {
        if (intervalId) clearInterval(intervalId);
        const maxSeconds = Math.round(maxWaitMs / 1000);
        const errorMsg = `STEP 2: Tidsavbrudd ved lasting av NutrientViewer API (ventet ${maxSeconds}s). ` +
          `Scriptet ble lastet, men API-et ble ikke tilgjengelig. Dette kan skyldes nettverksproblemer, ` +
          `firewall-blokering, eller at Dynamics laster ressurser saktere enn forventet.`;
        console.error(errorMsg);
        reject(new Error(errorMsg));
      } else if (elapsedSeconds % 5 === 0 && elapsedSeconds > 0) {
        // Log progress every 5 seconds
        console.log(`⏳ Venter på NutrientViewer API... (${elapsedSeconds}s/${Math.round(maxWaitMs/1000)}s)`);
      }
    };

    // Check if script exists but API is not ready yet
    if (document.getElementById("nutrient-sdk-script")) {
      console.log("⏳ SDK-script finnes, venter på at API blir tilgjengelig...");
      const intervalId = setInterval(() => checkAPI(intervalId), 500);
      checkAPI(intervalId);
      return;
    }

    // Script doesn't exist, create and load it
    console.log("📥 Laster ned Nutrient SDK-script fra CDN...");
    const script = document.createElement("script");
    script.id = "nutrient-sdk-script";
    script.src = "https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.8.0/nutrient-viewer.js";
    script.async = true;
    
    script.onload = () => {
      console.log("✓ SDK-script lastet ned, venter på at API initialiseres...");
      const intervalId = setInterval(() => checkAPI(intervalId), 500);
      checkAPI(intervalId);
    };
    
    script.onerror = (event) => {
      const errorMsg = "STEP 2: Kunne ikke laste NutrientViewer-skriptet fra CDN. " +
        "Sjekk internettforbindelse, firewall-innstillinger, eller om CDN-et er tilgjengelig. " +
        `URL: ${script.src}`;
      console.error(errorMsg, event);
      reject(new Error(errorMsg));
    };
    
    document.body.appendChild(script);
  });
};
