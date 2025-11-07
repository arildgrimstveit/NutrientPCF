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
import "./NutrientViewerComponent.css";

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
          baseUrl: "https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.4.0/",
          container: containerElement,
          document: documentBuffer,
          locale: "nb-NO",
        }) as unknown as NutrientViewerInstance;

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
      className="nutrient-viewer-container"
      style={{
        height: `${viewerHeight}px`,
        maxWidth: `${viewerWidth}px`,
      }}
    >
      <div
        ref={divRef}
        role="application"
        aria-label="PDF Document Viewer"
        aria-describedby="pdf-viewer-description"
        tabIndex={0}
        className="nutrient-viewer-div"
      />
      {showWaitingState && (
        <div className="waiting-state-overlay">
          <div className="waiting-state-title">
            📄 Venter på dokument
          </div>
          <div className="waiting-state-description">
            Last inn et dokument for å komme i gang.
          </div>
        </div>
      )}
      {error && (
        <div className="error-overlay">
          <div className="error-title">
            ⚠️ {error.message}
          </div>

          <div className="error-details">
            {error.technicalDetails}
          </div>

          <button
            className="retry-button"
            onClick={() => {
              setError(null);
              setRetryTrigger(prev => !prev);
            }}
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
