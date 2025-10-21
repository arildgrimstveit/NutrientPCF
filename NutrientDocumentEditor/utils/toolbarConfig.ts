/**
 * Toolbar configuration utilities for Nutrient Viewer
 */

import { NutrientViewerInstance } from "../types";

interface ToolbarHandlers {
  onShowRedactionDialog: () => void;
  onSave: (base64: string) => void;
  convertArrayBufferToBase64: (buffer: ArrayBuffer) => string;
}

/**
 * Creates toolbar configuration for the Nutrient viewer
 */
export const createToolbarConfig = (
  instance: NutrientViewerInstance,
  handlers: ToolbarHandlers
) => [
  // Navigation tools
  { type: "zoom-in" },
  { type: "zoom-out" },
  { type: "pager" },
  { type: "spacer" },
  
  // Redaction tools
  { type: "redact-text-highlighter" },
  { type: "redact-rectangle" },
  
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
    title: "Fjern annoteringer",
    onPress: async () => {
      try {
        const pageCount = instance.totalPageCount ?? 0;
        const pages = await Promise.all(
          Array.from({ length: pageCount }).map((_, i) => instance.getAnnotations(i))
        );
        const allAnnotations = pages.flatMap(annotations =>
          Array.isArray(annotations) ? annotations : annotations.toArray()
        );
        await instance.delete(allAnnotations);
      } catch (err) {
        console.error("Error deleting all annotations:", err);
      }
    },
  },
  
  // Apply redactions
  {
    type: "custom",
    id: "btnApplyRedactions",
    title: "Sladd",
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
    title: "Lagre",
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

