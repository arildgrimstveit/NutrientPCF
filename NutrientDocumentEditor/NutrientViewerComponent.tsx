import * as React from "react";
import nutrient from "@nutrient-sdk/viewer";
import {
  INutrientViewerProps,
  NutrientViewerInstance,
  ErrorDetails,
} from "./types";
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
  const [loadingProgress, setLoadingProgress] =
    React.useState<{ loaded: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<ErrorDetails | null>(null);
  const [retryTrigger, setRetryTrigger] = React.useState(false);

  // Redaction dialog state
  const [showRedactionDialog, setShowRedactionDialog] = React.useState(false);
  const [pageRangeInput, setPageRangeInput] = React.useState("");
  const [selectedRedactionOption, setSelectedRedactionOption] =
    React.useState<"current" | "range">("current");
  const [dialogError, setDialogError] = React.useState("");
  const pageRangeInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Initialize viewer whenever base64 or URL changes.
   * Proper unloading (sync) before loading the new document.
   */
  React.useEffect(() => {
    const containerElement = divRef.current;
    if (!containerElement) return;

    let isCancelled = false;

    const initViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 🔥 ALWAYS unload old instance synchronously
        try {
          nutrient.unload(containerElement);
        } catch {
          /* ignore */
        }

        if (!documentBase64 && !documentUrl) {
          setIsLoading(false);
          setInstance(null);
          return;
        }

        // Load document buffer
        let documentBuffer: ArrayBuffer;

        if (documentBase64) {
          documentBuffer = convertBase64ToArrayBuffer(documentBase64);
        } else if (documentUrl) {
          documentBuffer = await fetchDocumentFromUrl(documentUrl, (loaded, total) => {
            if (!isCancelled) setLoadingProgress({ loaded, total });
          });
        } else {
          throw new Error("No document available");
        }

        if (isCancelled) return;

        setLoadingProgress(null);

        // Load viewer
        const loadedInstance = (await nutrient.load({
          disableWebAssemblyStreaming: true,
          baseUrl: "https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.4.0/",
          container: containerElement,
          document: documentBuffer,
          locale: "nb-NO",
        })) as unknown as NutrientViewerInstance;


        if (isCancelled) {
          try {
            nutrient.unload(containerElement);
          } catch {
            /* ignore */
          }
          return;
        }

        // Toolbars
        loadedInstance.setToolbarItems(
          createToolbarConfig(loadedInstance, {
            onShowRedactionDialog: () => setShowRedactionDialog(true),
            onSave,
            convertArrayBufferToBase64,
          })
        );

        loadedInstance.setAnnotationToolbarItems?.((annotation) => {
          const annotations = Array.isArray(annotation) ? annotation : [annotation];
          return [
            {
              type: "custom",
              id: "delete-selected",
              title: "Slett annotering",
              icon: "<svg…/>",
              onPress: async () => loadedInstance.delete(annotations),
            },
            { type: "spacer" },
            {
              type: "custom",
              id: "apply-redactions",
              title: "Sladd annoteringer",
              icon: "<svg…/>",
              alignment: "right",
              onPress: async () => loadedInstance.applyRedactions(),
            },
          ];
        });

        if (!isCancelled) {
          setInstance(loadedInstance);
          setIsLoading(false);
        }
      } catch (err) {
        if (isCancelled) return;

        const message = err instanceof Error ? err.message : String(err);
        setError({
          message,
          technicalDetails: err instanceof Error ? err.stack ?? message : message,
        });
        setIsLoading(false);
        setLoadingProgress(null);
      }
    };

    void initViewer();

    return () => {
      isCancelled = true;
    };
  }, [documentBase64]);

  /**
   * Unload viewer on component unmount (sync)
   */
  React.useEffect(() => {
    return () => {
      const containerElement = divRef.current;
      if (!containerElement) return;
      try {
        nutrient.unload(containerElement);
      } catch {
        /* ignore */
      }
    };
  }, []);

  // REDACTION HANDLERS =======================================================
  const handleSubmit = React.useCallback(async () => {
    if (!instance) return;

    try {
      setDialogError("");
      const totalPages = instance.totalPageCount ?? 0;

      if (selectedRedactionOption === "current") {
        setShowRedactionDialog(false);
        await redactPages(instance, [instance.viewState.currentPageIndex]);
      } else {
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

  const showWaiting = !documentBase64 && !documentUrl && !error;

  return (
    <div
      className="nutrient-viewer-container"
      style={{ height: `${viewerHeight}px`, maxWidth: `${viewerWidth}px` }}
    >
      <div ref={divRef} className="nutrient-viewer-div" />

      {showWaiting && (
        <div className="waiting-state-overlay">
          <div className="waiting-state-title">📄 Venter på dokument</div>
          <div>Last inn et dokument for å komme i gang.</div>
        </div>
      )}

      {error && (
        <div className="error-overlay">
          <div className="error-title">⚠️ {error.message}</div>
          <div className="error-details">{error.technicalDetails}</div>
          <button className="retry-button" onClick={() => setRetryTrigger(p => !p)}>
            🔄 Prøv igjen
          </button>
        </div>
      )}

      <ProgressIndicator isLoading={isLoading} loadingProgress={loadingProgress} />

      <RedactionDialog
        show={showRedactionDialog}
        instance={instance}
        selectedOption={selectedRedactionOption}
        pageRangeInput={pageRangeInput}
        pageRangeInputRef={pageRangeInputRef}
        errorMessage={dialogError}
        onOptionChange={setSelectedRedactionOption}
        onPageRangeChange={setPageRangeInput}
        onCancel={handleCancel}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  );
};

export default NutrientViewerComponent;
