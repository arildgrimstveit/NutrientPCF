export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
}

export interface ViewState {
  currentPageIndex: number;
}

// Simplified interface matching only the methods we actually use
export interface NutrientViewerInstance {
  setToolbarItems: (items: any) => void;
  setAnnotationToolbarItems?: (callback: (annotation: any) => any) => void;
  exportPDF: () => Promise<ArrayBuffer>;
  totalPageCount?: number;
  getAnnotations: (pageIndex: number) => Promise<any>;
  delete: (items: any) => Promise<any>;
  viewState: ViewState;
  pageInfoForIndex: (pageIndex: number) => PageInfo | null;
  create: (annotation: any) => Promise<any>;
  applyRedactions: () => Promise<void>;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RedactionAnnotation {
  pageIndex: number;
  boundingBox: Rect; // Required: bounding box containing all rects
  rects: unknown; // Required: Must be PSPDFKit.Immutable.List<Rect>
}

export interface ErrorDetails {
  message: string;
  technicalDetails: string;
}
