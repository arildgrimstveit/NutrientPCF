export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
}

export interface ViewState {
  currentPageIndex: number;
}

export interface NutrientViewerInstance {
  setToolbarItems: (callback: (items: unknown[]) => unknown[]) => void;
  exportPDF: () => Promise<ArrayBuffer>;
  totalPageCount?: number;
  getAnnotations: (pageIndex: number) => Promise<unknown[] | { toArray: () => unknown[] }>;
  delete: (items: unknown[]) => Promise<void>;
  viewState: ViewState;
  pageInfoForIndex: (pageIndex: number) => Promise<PageInfo>;
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

export interface NutrientViewerAPI {
  load: (config: {
    disableWebAssemblyStreaming: boolean;
    container: HTMLElement;
    document: ArrayBuffer;
    enableHistory: boolean;
    locale?: string;
  }) => Promise<NutrientViewerInstance>;
  unload: (container: HTMLElement) => void;
  Annotations: {
    RedactionAnnotation: new (config: RedactionAnnotation) => unknown;
  };
  Geometry: {
    Rect: new (config: Rect) => Rect;
  };
  Immutable: {
    List: <T>(items: T[]) => unknown;
  };
}

declare global {
  interface Window {
    NutrientViewer: NutrientViewerAPI;
  }
}

export {};


