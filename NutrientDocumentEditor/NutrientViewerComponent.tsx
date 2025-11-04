import * as React from "react";
import nutrient from "@nutrient-sdk/viewer";
import { INutrientViewerProps, NutrientViewerInstance, ErrorDetails } from "./types";
import {
  convertBase64ToArrayBuffer,
  fetchDocumentFromUrl,
  convertArrayBufferToBase64,
  redactPages,
  parsePageRange,
  createToolbarConfig,
} from "./utils";
import { ProgressIndicator, RedactionDialog } from "./components";

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
  const [retryTrigger, setRetryTrigger] = React.useState(false);

  // State for redaction dialog
  const [showRedactionDialog, setShowRedactionDialog] = React.useState(false);
  const [pageRangeInput, setPageRangeInput] = React.useState("");
  const [selectedRedactionOption, setSelectedRedactionOption] = React.useState<"current" | "range">("current");
  const [dialogError, setDialogError] = React.useState("");
  const pageRangeInputRef = React.useRef<HTMLInputElement>(null);

  // Viewer initialization effect
  React.useEffect(() => {
    if (!documentBase64 && !documentUrl) {
      return;
    }
    
    if (!divRef.current) return;
    const containerElement = divRef.current;
    let isCancelled = false;

    const initViewer = async () => {
      try {
        if (isCancelled) return;

        setIsLoading(true);
        setError(null);

        // Unload any existing instance to prevent memory leaks
        if (containerElement) {
          try {
            nutrient.unload(containerElement);
          } catch (e) {
            // Ignore error if no instance was loaded
          }
        }

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

        // Load the Nutrient instance
        const loadedInstance = await nutrient.load({
          disableWebAssemblyStreaming: true,
          baseUrl: "https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.8.0/",
          container: containerElement,
          document: documentBuffer,
          locale: "nb-NO",
        }) as NutrientViewerInstance;

        // Configure toolbar
        const toolbarItems = createToolbarConfig(loadedInstance, {
          onShowRedactionDialog: () => setShowRedactionDialog(true),
          onSave,
          convertArrayBufferToBase64,
        });
        loadedInstance.setToolbarItems(toolbarItems);

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
                await loadedInstance.delete(annotations);
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
                await loadedInstance.applyRedactions();
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
          message: errorMessage,
          technicalDetails: err instanceof Error ? err.stack ?? errorMessage : errorMessage,
        });
        setIsLoading(false);
        setLoadingProgress(null);
      }
    };

    void initViewer();

    // Cleanup on unmount
    return () => {
      isCancelled = true;
      if (containerElement) {
        try {
          nutrient.unload(containerElement);
        } catch (e) {
          console.warn("Error unloading Nutrient instance:", e);
        }
      }
    };
  }, [documentBase64, documentUrl, retryTrigger]);

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

  // Show a friendly "waiting for document" message when no document is loaded
  const showWaitingState = !documentBase64 && !documentUrl && !error;

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
            Last inn et dokument for å komme i gang.
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
            padding: "24px",
            backgroundColor: "#fff",
            border: "2px solid #d13438",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxWidth: "500px",
            width: "90%",
            zIndex: 1000,
          }}
        >
          <div style={{ color: "#d13438", fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>
            ⚠️ {error.message}
          </div>

          <div style={{
            fontSize: "11px",
            fontFamily: "monospace",
            backgroundColor: "#f3f2f1",
            padding: "12px",
            borderRadius: "4px",
            maxHeight: "120px",
            overflow: "auto",
            color: "#605e5c",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            marginBottom: "16px"
          }}>
            {error.technicalDetails}
          </div>

          <button
            onClick={() => {
              setError(null);
              setRetryTrigger(prev => !prev);
            }}
            style={{
              width: "100%",
              padding: "10px 16px",
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
