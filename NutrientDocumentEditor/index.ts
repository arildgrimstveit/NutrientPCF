import { IInputs, IOutputs } from "./generated/ManifestTypes";
import NutrientViewerComponent from "./NutrientViewerComponent";
import ExampleUsage from "./ExampleUsage";
import * as React from "react";

export class NutrientDocumentEditor
  implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
  private notifyOutputChanged: () => void;
  private pdfBase64 = ""; // Stores the saved PDF Base64
  
  // Track the original document inputs to detect when a new document is loaded
  private lastDocumentBase64 = "";
  private lastDocumentUrl = "";
  
  // Track whether we have a saved version that should be displayed
  private hasSavedVersion = false;

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   */
  public init(
    _context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    _container: HTMLDivElement
  ): void {
    this.notifyOutputChanged = notifyOutputChanged;
    
    // Preload Nutrient SDK script early to avoid delays on first document load
    // This helps especially in Dynamics environment where resources load slower
    if (!document.getElementById("nutrient-sdk-script")) {
      console.log("Preloading Nutrient SDK in PCF init");
      const script = document.createElement("script");
      script.id = "nutrient-sdk-script";
      script.src = "https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.8.0/nutrient-viewer.js";
      script.async = true;
      script.onload = () => console.log("Nutrient SDK preloaded successfully");
      script.onerror = () => console.error("Failed to preload Nutrient SDK");
      document.body.appendChild(script);
    }
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   * @returns ReactElement root react element for the control
   */
  public updateView(
    context: ComponentFramework.Context<IInputs>
  ): React.ReactElement {
    // Set this to true to test the example component (local development),
    // false for production
    const useExample = false;

    if (useExample) {
      return React.createElement(ExampleUsage);
    }

    const documentBase64 = context.parameters.document.raw ?? "";
    const documentUrl = context.parameters.documenturl.raw ?? "";

    // Detect if a NEW document has been loaded (different from the last one we saw)
    const isNewDocument = 
      (documentBase64 !== this.lastDocumentBase64) || 
      (documentUrl !== this.lastDocumentUrl);

    // If it's a new document, reset our saved state
    if (isNewDocument) {
      this.lastDocumentBase64 = documentBase64;
      this.lastDocumentUrl = documentUrl;
      this.hasSavedVersion = false;
      this.pdfBase64 = "";
    }

    // Determine which document to display:
    // - If we have a saved version AND it's not a new document, use the saved version
    // - Otherwise, use the original input
    let displayDocumentBase64 = documentBase64;
    let displayDocumentUrl = documentUrl;

    if (this.hasSavedVersion && !isNewDocument) {
      // Show the saved (edited) version instead of the original
      displayDocumentBase64 = this.pdfBase64;
      displayDocumentUrl = ""; // Clear URL since we're using base64
    }

    return React.createElement(NutrientViewerComponent, {
      documentBase64: displayDocumentBase64 || undefined,
      documentUrl: displayDocumentUrl || undefined,
      viewerHeight: context.parameters.viewerheight.raw ?? 600,
      viewerWidth: context.parameters.viewerwidth.raw ?? 800,
      onSave: this.handleSave.bind(this),
    });
  }

  private handleSave(pdfBase64: string) {
    this.pdfBase64 = pdfBase64;
    this.hasSavedVersion = true; // Mark that we now have a saved version to display
    this.notifyOutputChanged();
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
   */
  public getOutputs(): IOutputs {
    return {
      pdfdocument: this.pdfBase64, // Return updated PDF base64
    };
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Add code to cleanup control if necessary
  }
}
