export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
}

export interface ViewState {
  currentPageIndex: number;
}

// Toolbar item types based on usage in toolbarConfig.ts
export type ToolbarItem =
  | { type: string; dropdownGroup?: null }
  | {
      type: "custom";
      id: string;
      title: string;
      onPress: () => void | Promise<void>;
      icon?: string;
    }
  | { type: "spacer" };

// Use unknown for Nutrient SDK types to avoid type conflicts
export type NutrientAnnotation = unknown;
export type AnnotationCollection = unknown[] | { toArray: () => unknown[] };

// Simplified interface matching only the methods we actually use
export interface NutrientViewerInstance {
  setToolbarItems: (items: ToolbarItem[]) => void;
  setAnnotationToolbarItems?: (callback: (annotation: unknown) => ToolbarItem[]) => void;
  exportPDF: () => Promise<ArrayBuffer>;
  totalPageCount?: number;
  getAnnotations: (pageIndex: number) => Promise<AnnotationCollection>;
  delete: (items: unknown[]) => Promise<void>;
  viewState: ViewState;
  pageInfoForIndex: (pageIndex: number) => PageInfo | null;
  create: (annotation: unknown) => Promise<unknown>;
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
