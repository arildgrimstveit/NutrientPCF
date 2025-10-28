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

  // Generate a stable key based on document content to detect changes
  const documentKey = React.useMemo(() => {
    if (!documentBase64 && !documentUrl) return 'no-document';
    const base64Hash = documentBase64 ? documentBase64.slice(0, 100) : '';
    const urlHash = documentUrl ?? '';
    return `${base64Hash}-${urlHash}`;
  }, [documentBase64, documentUrl]);

  // State for redaction dialog
  const [showRedactionDialog, setShowRedactionDialog] = React.useState(false);
  const [pageRangeInput, setPageRangeInput] = React.useState("");
  const [selectedRedactionOption, setSelectedRedactionOption] = React.useState<"current" | "range">("current");
  const [dialogError, setDialogError] = React.useState("");
  const pageRangeInputRef = React.useRef<HTMLInputElement>(null);

  // Viewer initialization effect
  React.useEffect(() => {
    if (!documentBase64 && !documentUrl) return;
    if (!divRef.current) return;

    const containerElement = divRef.current;
    let loadedInstance: NutrientViewerInstance | null = null;

    const initViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // STEP 1: Unload any existing instance
        try {
          if (window.NutrientViewer && containerElement) {
            window.NutrientViewer.unload(containerElement);
            console.log("STEP 1: Existing instance unloaded");
          }
        } catch (e) {
          // This is expected if no instance exists
          console.log("STEP 1: No existing instance to unload");
        }

        // STEP 2: Load the Nutrient SDK script
        console.log("STEP 2: Loading Nutrient SDK script...");
        await loadNutrientScript();
        console.log("STEP 2: Nutrient SDK script loaded successfully");

        // STEP 3: Load the document
        console.log("STEP 3: Loading document...");
        let documentBuffer: ArrayBuffer;

        if (documentUrl) {
          console.log("STEP 3a: Fetching document from URL:", documentUrl);
          documentBuffer = await fetchDocumentFromUrl(documentUrl, (loaded, total) => {
            setLoadingProgress({ loaded, total });
          });
          console.log("STEP 3a: Document fetched from URL successfully");
        } else if (documentBase64) {
          console.log("STEP 3b: Converting base64 to ArrayBuffer");
          documentBuffer = convertBase64ToArrayBuffer(documentBase64);
          console.log("STEP 3b: Document converted successfully");
        } else {
          throw new Error("STEP 3: Ingen dokument tilgjengelig");
        }

        setLoadingProgress(null);

        // STEP 4: Verify NutrientViewer API is available
        console.log("STEP 4: Verifying NutrientViewer API...");
        const nutrient = window.NutrientViewer;
        if (!nutrient) {
          throw new Error("STEP 4: NutrientViewer API ikke tilgjengelig etter skriptlasting");
        }
        console.log("STEP 4: NutrientViewer API verified");

        // STEP 5: Load the Nutrient instance
        console.log("STEP 5: Loading Nutrient instance into container...");
        loadedInstance = await nutrient.load({
          disableWebAssemblyStreaming: true,
          container: containerElement,
          document: documentBuffer,
          enableHistory: true,
          locale: "nb-NO",
        });
        console.log("STEP 5: Nutrient instance loaded successfully");

        // STEP 6: Configure toolbar
        console.log("STEP 6: Configuring toolbar...");
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
        console.log("STEP 6: Toolbar configured successfully");

        setInstance(loadedInstance);
        setIsLoading(false);
        console.log("SUCCESS: Nutrient viewer initialized completely");

      } catch (err) {
        console.error("ERROR during initialization:", err);

        // Create detailed error information
        const errorMessage = err instanceof Error ? err.message : String(err);
        const stepRegex = /STEP \d[a-z]?/;
        const stepMatch = stepRegex.exec(errorMessage);
        const errorCode = errorMessage.includes("STEP")
          ? stepMatch?.[0].replace(" ", "_") ?? "ERR_UNKNOWN"
          : "ERR_UNKNOWN";

        setError({
          code: errorCode,
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
      console.log("CLEANUP: Unmounting component");
      if (loadedInstance && containerElement) {
        try {
          window.NutrientViewer?.unload(containerElement);
          console.log("CLEANUP: Instance unloaded successfully");
        } catch (e) {
          console.warn("CLEANUP: Error during unload:", e);
        }
      }
    };
  }, [documentBase64, documentUrl, onSave, retryCount, documentKey]);

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
        key={documentKey}
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
