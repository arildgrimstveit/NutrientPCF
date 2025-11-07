import { NutrientViewerInstance, AnnotationCollection } from "../types";

interface ToolbarHandlers {
  onShowRedactionDialog: () => void;
  onSave: (base64: string) => void;
  convertArrayBufferToBase64: (buffer: ArrayBuffer) => string;
}

export const createToolbarConfig = (
  instance: NutrientViewerInstance,
  handlers: ToolbarHandlers
): import("../types").ToolbarItem[] => [
  // Navigation tools
  { type: "zoom-in" },
  { type: "zoom-out" },
  { type: "pager" },
  { type: "spacer" },
  
  // Redaction tools - separated to prevent grouping
  { type: "redact-text-highlighter", dropdownGroup: null },
  { type: "redact-rectangle", dropdownGroup: null },
  
  // Custom redaction button for whole pages
  {
    type: "custom",
    id: "btnRedactPages",
    title: "Sladd hele sider",
    onPress: handlers.onShowRedactionDialog,
  },
  
  // Undo/Redo functionality
  { type: "undo" },
  { type: "redo" },
  { type: "spacer" },
  
  // Delete all annotations
  {
    type: "custom",
    id: "btnDeleteAllAnnotations",
    title: "Slett alle annoteringer",
    onPress: async () => {
      const pageCount = instance.totalPageCount ?? 0;
      const pages = await Promise.all(
        Array.from({ length: pageCount }).map((_, i) => instance.getAnnotations(i))
      );
      const allAnnotations = pages.flatMap((annotations: AnnotationCollection) =>
        Array.isArray(annotations) ? annotations : annotations.toArray()
      );
      await instance.delete(allAnnotations);
    },
  },
  
  // Apply redactions
  {
    type: "custom",
    id: "btnApplyRedactions",
    title: "Sladd annoteringer",
    onPress: async () => {
      try {
        await instance.applyRedactions();
      } catch (err) {
        console.error("Error applying redactions:", err);
      }
    },
  },
  
  // Save functionality
  {
    type: "custom",
    id: "btnSaveRedactedCopy",
    title: "Lagre dokument",
    onPress: async () => {
      try {
        const pdfBuffer = await instance.exportPDF();
        const pdfBase64 = handlers.convertArrayBufferToBase64(pdfBuffer);
        handlers.onSave(pdfBase64);
      } catch (err) {
        console.error("Error saving redacted copy:", err);
      }
    },
  },
];

