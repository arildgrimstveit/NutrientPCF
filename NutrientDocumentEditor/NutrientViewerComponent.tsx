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

  // State for document loading
  const [documentArrayBuffer, setDocumentArrayBuffer] = React.useState<ArrayBuffer | null>(null);

  // State for redaction dialog
  const [showRedactionDialog, setShowRedactionDialog] = React.useState(false);
  const [pageRangeInput, setPageRangeInput] = React.useState("");
  const [selectedRedactionOption, setSelectedRedactionOption] = React.useState<"current" | "all" | "range">("current");
  const pageRangeInputRef = React.useRef<HTMLInputElement>(null);

  // Document loading effect that handles both URL and Base64 inputs
  // Only re-runs when documentBase64 or documentUrl changes
  React.useEffect(() => {
    const loadDocument = async () => {
      if (!documentBase64 && !documentUrl) {
        setDocumentArrayBuffer(null);
        return;
      }
      setIsLoading(true);
      setLoadingProgress(null);

      try {
        let buffer: ArrayBuffer;
        if (documentUrl) {
          buffer = await fetchDocumentFromUrl(documentUrl, (loaded, total) => {
            setLoadingProgress({ loaded, total });
          });
        } else {
          buffer = convertBase64ToArrayBuffer(documentBase64!);
        }

        setDocumentArrayBuffer(buffer);
      } catch (error) {
        console.error("Error loading document:", error);
        setDocumentArrayBuffer(null);
      } finally {
        setIsLoading(false);
        setLoadingProgress(null);
      }
    };

    void loadDocument();
  }, [documentBase64, documentUrl]);


  React.useEffect(() => {
    if (!documentArrayBuffer || !divRef.current) {
      return;
    }

    let currentInstance: NutrientViewerInstance | null = null;

    const initViewer = async () => {
      try {
        await loadNutrientScript();

        const nutrient = window.NutrientViewer;
        if (!nutrient) {
          throw new Error("NutrientViewer not found after script load");
        }

        const newInstance = await nutrient.load({
          disableWebAssemblyStreaming: true,
          container: divRef.current!,
          document: documentArrayBuffer,
          enableHistory: true,
          locale: "nb-NO"
        });

        currentInstance = newInstance;
        setInstance(newInstance);

        const toolbarItems = createToolbarConfig(newInstance, {
          onShowRedactionDialog: () => setShowRedactionDialog(true),
          onSave,
          convertArrayBufferToBase64,
        });

        newInstance.setToolbarItems(() => toolbarItems);
      } catch (err) {
        console.error("Error loading NutrientViewer:", err);
      }
    };

    void initViewer();

    return () => {
      if (currentInstance && divRef.current) {
        try {
          window.NutrientViewer?.unload(divRef.current);
        } catch (e) {
          console.warn("Error during unload:", e);
        }
        currentInstance = null;
        setInstance(null);
      }
    };
  }, [documentArrayBuffer, onSave]);

  // Handlers for redaction dialog
  const handleSubmit = React.useCallback(async () => {
    if (!instance) return;

    try {
      const totalPages = instance.totalPageCount ?? 0;

      if (selectedRedactionOption === "current") {
        setShowRedactionDialog(false);
        await redactPages(instance, [instance.viewState.currentPageIndex]);
      } else if (selectedRedactionOption === "all") {
        setShowRedactionDialog(false);
        const allPageIndices = Array.from({ length: totalPages }, (_, i) => i);
        await redactPages(instance, allPageIndices);
      } else if (selectedRedactionOption === "range") {
        const pageIndices = parsePageRange(pageRangeInput, totalPages);
        setShowRedactionDialog(false);
        setPageRangeInput("");
        await redactPages(instance, pageIndices);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  }, [instance, selectedRedactionOption, pageRangeInput]);

  const handleCancel = React.useCallback(() => {
    setShowRedactionDialog(false);
    setPageRangeInput("");
    setSelectedRedactionOption("current");
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
        onOptionChange={setSelectedRedactionOption}
        onPageRangeChange={setPageRangeInput}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NutrientViewerComponent;
