import nutrient from "@nutrient-sdk/viewer";
import { NutrientViewerInstance } from "../types";

// Redact a single page with a full-page redaction annotation
export const redactPage = async (
  nutrientInstance: NutrientViewerInstance,
  pageIndex: number
): Promise<void> => {
  try {
    // Get page dimensions
    const pageInfo = nutrientInstance.pageInfoForIndex(pageIndex);
    if (!pageInfo) {
      throw new Error(`Could not get page info for page ${pageIndex + 1}`);
    }
    const { width, height } = pageInfo;

    // Create a rectangle covering the entire page
    const boundingBox = new nutrient.Geometry.Rect({
      left: 0,
      top: 0,
      width: width,
      height: height
    });

    // Create a redaction annotation covering the entire page
    const redactionAnnotation = new nutrient.Annotations.RedactionAnnotation({
      pageIndex: pageIndex,
      boundingBox: boundingBox,
      rects: nutrient.Immutable.List([boundingBox])
    });

    // Add the redaction annotation to the document
    await nutrientInstance.create(redactionAnnotation);
  } catch (err) {
    console.error(`Error redacting page ${pageIndex + 1}:`, err);
    throw err;
  }
};

// Redact multiple pages and apply redactions
export const redactPages = async (
  nutrientInstance: NutrientViewerInstance,
  pageIndices: number[]
): Promise<void> => {
  try {
    // Create redaction annotations for all specified pages
    for (const pageIndex of pageIndices) {
      await redactPage(nutrientInstance, pageIndex);
    }

    // Apply all redactions at once
    await nutrientInstance.applyRedactions();
  } catch (err) {
    console.error("Error redacting pages:", err);
  }
};

// Parse page range string (e.g., "1-3,5,7-9") to zero-based page indices
export const parsePageRange = (input: string, totalPages: number): number[] => {
  const pageIndices: number[] = [];
  const parts = input.split(",").map(p => p.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      // Handle range like "1-3"
      const [startStr, endStr] = part.split("-").map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
        throw new Error(`Ugyldig sideområde: ${part}`);
      }

      for (let i = start; i <= end; i++) {
        pageIndices.push(i - 1); // Convert to 0-based index
      }
    } else {
      // Handle single page like "5"
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1 || page > totalPages) {
        throw new Error(`Ugyldig sidenummer: ${part}`);
      }
      pageIndices.push(page - 1); // Convert to 0-based index
    }
  }

  return pageIndices;
};

