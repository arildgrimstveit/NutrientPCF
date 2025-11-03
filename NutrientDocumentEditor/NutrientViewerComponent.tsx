import * as React from "react";
import { INutrientViewerProps, NutrientViewerInstance } from "./types";
import {
  convertBase64ToArrayBuffer,
  fetchDocumentFromUrl,
  convertArrayBufferToBase64,
  loadNutrientScript,
  redactPages,
  parsePageRange,
  createToolbarConfig,
} from "./utils";
import { ProgressIndicator, RedactionDialog } from "./components";

interface ErrorDetails {
  code: string;
  message: string;
  technicalDetails: string;
  timestamp: Date;
}

const NutrientViewerComponent: React.FC<INutrientViewerProps> = ({
  documentBase64,
  documentUrl,
  viewerHeight,
  viewerWidth,
  onSave,
}) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  const [instance, setInstance] = React.useState<NutrientViewerInstance | null>(null);
  const [loadingProgress, setLoadingProgress] = React.useState<{ loaded: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<ErrorDetails | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  
  // Use a ref for initial mount check to avoid triggering effect re-runs
  const isInitialMountRef = React.useRef(true);

  // State for redaction dialog
  const [showRedactionDialog, setShowRedactionDialog] = React.useState(false);
  const [pageRangeInput, setPageRangeInput] = React.useState("");
  const [selectedRedactionOption, setSelectedRedactionOption] = React.useState<"current" | "range">("current");
  const [dialogError, setDialogError] = React.useState("");
  const pageRangeInputRef = React.useRef<HTMLInputElement>(null);

  // Viewer initialization effect
  React.useEffect(() => {
    if (!documentBase64 && !documentUrl) {
      // No document loaded yet - don't show error on initial mount
      if (!isInitialMountRef.current) {
        setError({
          code: "NO_DOCUMENT",
          message: "No document loaded",
          technicalDetails: "No document source (base64 or URL) provided",
          timestamp: new Date(),
        });
      }
      return;
    }
    
    // Mark that we're past the initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }
    
    if (!divRef.current) return;

    const containerElement = divRef.current;
    let loadedInstance: NutrientViewerInstance | null = null;
    let isCancelled = false;

    const initViewer = async () => {
      try {
        // Brief delay to allow Dynamics environment to stabilize
        await new Promise(resolve => setTimeout(resolve, 200));

        if (isCancelled) return;

        setIsLoading(true);
        setError(null);

        // Unload any existing instance to prevent memory leaks
        if (window.NutrientViewer && containerElement) {
          try {
            window.NutrientViewer.unload(containerElement);
          } catch (e) {
            // Ignore error if no instance was loaded
          }
        }

        // Load the Nutrient SDK script
        await loadNutrientScript();

        // Load the document
        let documentBuffer: ArrayBuffer;

        if (documentUrl) {
          documentBuffer = await fetchDocumentFromUrl(documentUrl, (loaded, total) => {
            setLoadingProgress({ loaded, total });
          });
        } else if (documentBase64) {
          documentBuffer = convertBase64ToArrayBuffer(documentBase64);
        } else {
          throw new Error("No document available");
        }

        setLoadingProgress(null);

        // Verify NutrientViewer API is available
        const nutrient = window.NutrientViewer;
        if (!nutrient) {
          throw new Error("NutrientViewer API not available");
        }

        // Load the Nutrient instance
        loadedInstance = await nutrient.load({
          disableWebAssemblyStreaming: true,
          container: containerElement,
          document: documentBuffer,
          enableHistory: true,
          locale: "nb-NO",
        });

        // Configure toolbar
        const toolbarItems = createToolbarConfig(loadedInstance, {
          onShowRedactionDialog: () => setShowRedactionDialog(true),
          onSave,
          convertArrayBufferToBase64,
        });
        loadedInstance.setToolbarItems(() => toolbarItems);

        // Configure annotation toolbar
        loadedInstance.setAnnotationToolbarItems?.((annotation) => {
          const annotations = Array.isArray(annotation) ? annotation : [annotation];
          return [
            {
              type: 'custom',
              id: 'delete-selected',
              title: 'Slett annotering',
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
              onPress: async () => {
                await loadedInstance!.delete(annotations);
              }
            },
            { type: 'spacer' },
            {
              type: 'custom',
              id: 'apply-redactions',
              title: 'Sladd annoteringer',
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9.29 16.29a1 1 0 0 0 1.42 0l6-6a1 1 0 1 0-1.42-1.42L10 13.17l-2.29-2.3a1 1 0 1 0-1.42 1.42l3 3z"/></svg>',
              alignment: 'right',
              onPress: async () => {
                await loadedInstance!.applyRedactions();
              }
            }
          ];
        });

        setInstance(loadedInstance);
        setIsLoading(false);

      } catch (err) {
        console.error("Error initializing Nutrient viewer:", err);

        const errorMessage = err instanceof Error ? err.message : String(err);
        
        setError({
          code: "INITIALIZATION_ERROR",
          message: errorMessage,
          technicalDetails: err instanceof Error ? err.stack ?? errorMessage : errorMessage,
          timestamp: new Date(),
        });
        setIsLoading(false);
        setLoadingProgress(null);
      }
    };

    void initViewer();

    // Cleanup on unmount
    return () => {
      isCancelled = true;
      if (loadedInstance && containerElement) {
        try {
          window.NutrientViewer?.unload(containerElement);
        } catch (e) {
          console.warn("Error unloading Nutrient instance:", e);
        }
      }
    };
  }, [documentBase64, documentUrl, retryCount]);
  // Note: onSave is intentionally excluded from deps to prevent remount when PCF updateView creates new function reference

  // Handlers for redaction dialog
  const handleSubmit = React.useCallback(async () => {
    if (!instance) return;

    try {
      setDialogError("");
      const totalPages = instance.totalPageCount ?? 0;

      if (selectedRedactionOption === "current") {
        setShowRedactionDialog(false);
        await redactPages(instance, [instance.viewState.currentPageIndex]);
      } else if (selectedRedactionOption === "range") {
        const pageIndices = parsePageRange(pageRangeInput, totalPages);
        setShowRedactionDialog(false);
        setPageRangeInput("");
        await redactPages(instance, pageIndices);
      }
    } catch (err) {
      setDialogError((err as Error).message);
    }
  }, [instance, selectedRedactionOption, pageRangeInput]);

  const handleCancel = React.useCallback(() => {
    setShowRedactionDialog(false);
    setPageRangeInput("");
    setSelectedRedactionOption("current");
    setDialogError("");
  }, []);

  const handlePageRangeChange = React.useCallback((value: string) => {
    setPageRangeInput(value);
    setDialogError("");
  }, []);

  // Show a friendly "waiting for document" message on initial mount when no document is loaded
  const showWaitingState = isInitialMountRef.current && !documentBase64 && !documentUrl;

  return (
    <div
      style={{
        position: "relative",
        height: `${viewerHeight}px`,
        width: "100%",
        maxWidth: `${viewerWidth}px`,
      }}
    >
      <div
        ref={divRef}
        role="application"
        aria-label="PDF Document Viewer"
        aria-describedby="pdf-viewer-description"
        tabIndex={0}
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
          backgroundColor: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
          outline: "none",
        }}
      />
      {showWaitingState && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "32px",
            backgroundColor: "#fff",
            border: "2px solid #0078d4",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ color: "#0078d4", fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>
            📄 Venter på dokument
          </div>
          <div style={{ fontSize: "14px", color: "#605e5c", lineHeight: "1.5" }}>
            Dokumentviseren er klar. Last inn et dokument for å komme i gang.
          </div>
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "32px",
            backgroundColor: "#fff",
            border: "2px solid #d13438",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxWidth: "500px",
            width: "90%",
            textAlign: "left",
            zIndex: 1000,
          }}
        >
          <div style={{ color: "#d13438", fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
            ⚠️ Feil ved lasting av dokument
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#323130", marginBottom: "4px" }}>
              FEILKODE:
            </div>
            <div style={{
              fontSize: "14px",
              fontFamily: "monospace",
              backgroundColor: "#f3f2f1",
              padding: "8px",
              borderRadius: "4px",
              color: "#d13438",
              fontWeight: "bold"
            }}>
              {error.code}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#323130", marginBottom: "4px" }}>
              FEILMELDING:
            </div>
            <div style={{ fontSize: "14px", color: "#605e5c", lineHeight: "1.5" }}>
              {error.message}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#323130", marginBottom: "4px" }}>
              TIDSPUNKT:
            </div>
            <div style={{ fontSize: "13px", color: "#605e5c", fontFamily: "monospace" }}>
              {error.timestamp.toLocaleString('nb-NO')}
            </div>
          </div>

          <div style={{ marginBottom: "20px", paddingTop: "12px", borderTop: "1px solid #edebe9" }}>
            <div style={{ fontSize: "11px", color: "#a19f9d", marginBottom: "4px" }}>
              Tekniske detaljer (send til utvikler):
            </div>
            <div style={{
              fontSize: "11px",
              fontFamily: "monospace",
              backgroundColor: "#f3f2f1",
              padding: "8px",
              borderRadius: "4px",
              maxHeight: "100px",
              overflow: "auto",
              color: "#605e5c",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}>
              {error.technicalDetails}
            </div>
          </div>

          <button
            onClick={() => {
              setError(null);
              setRetryCount(retryCount + 1);
            }}
            style={{
              width: "100%",
              padding: "12px 20px",
              backgroundColor: "#0078d4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#106ebe")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0078d4")}
          >
            🔄 Prøv igjen
          </button>
        </div>
      )}
      <ProgressIndicator
        isLoading={isLoading}
        loadingProgress={loadingProgress}
      />
      <RedactionDialog
        show={showRedactionDialog}
        instance={instance}
        selectedOption={selectedRedactionOption}
        pageRangeInput={pageRangeInput}
        pageRangeInputRef={pageRangeInputRef}
        errorMessage={dialogError}
        onOptionChange={setSelectedRedactionOption}
        onPageRangeChange={handlePageRangeChange}
        onCancel={handleCancel}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  );
};

export default NutrientViewerComponent;
