export interface INutrientViewerProps {
  documentBase64?: string; // Base64 encoded PDF document
  documentUrl?: string; // URL to PDF document
  viewerHeight: number;
  viewerWidth: number;
  onSave: (pdfBase64: string) => void;
}


