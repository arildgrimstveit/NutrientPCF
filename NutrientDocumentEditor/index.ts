import { IInputs, IOutputs } from "./generated/ManifestTypes";
import NutrientViewerComponent from "./NutrientViewerComponent";
import ExampleUsage from "./ExampleUsage";
import * as React from "react";

// Set to true for local testing with ExampleUsage component
const USE_EXAMPLE = false;

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
  
  // Cache the bound onSave callback to maintain stable reference
  private boundHandleSave = this.handleSave.bind(this);

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
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   * @returns ReactElement root react element for the control
   */
  public updateView(
    context: ComponentFramework.Context<IInputs>
  ): React.ReactElement {
    // Use ExampleUsage for local testing
    if (USE_EXAMPLE) {
      return React.createElement(ExampleUsage);
    }

    const documentBase64 = context.parameters.document.raw ?? "";
    const documentUrl = context.parameters.documenturl.raw ?? "";

    // Detect if a new document has been loaded
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
    // - If we have a saved version and it's not a new document, use the saved version
    // - Otherwise, use the original input
    let displayDocumentBase64 = documentBase64;
    let displayDocumentUrl = documentUrl;

    if (this.hasSavedVersion && !isNewDocument) {
      // Show the saved (edited) version instead of the original
      displayDocumentBase64 = this.pdfBase64;
      displayDocumentUrl = ""; // Clear URL since we're using base64
    }

    const viewerHeight = context.parameters.viewerheight.raw ?? 600;
    const viewerWidth = context.parameters.viewerwidth.raw ?? 800;

    return React.createElement(NutrientViewerComponent, {
      documentBase64: displayDocumentBase64 || undefined,
      documentUrl: displayDocumentUrl || undefined,
      viewerHeight,
      viewerWidth,
      onSave: this.boundHandleSave,
    });
  }

  private handleSave(pdfBase64: string) {
    this.pdfBase64 = pdfBase64;
    this.hasSavedVersion = true;
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
    // Cleanup is handled by NutrientViewerComponent's useEffect cleanup
  }
}
