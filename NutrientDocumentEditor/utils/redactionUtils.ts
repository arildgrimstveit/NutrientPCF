/**
 * Utilities for handling page redactions in Nutrient documents
 */

import { NutrientViewerInstance } from "../types";

/**
 * Redacts a single page by creating a full-page redaction annotation
 * @param nutrientInstance - The Nutrient viewer instance
 * @param pageIndex - The zero-based index of the page to redact
 */
export const redactPage = async (
  nutrientInstance: NutrientViewerInstance,
  pageIndex: number
): Promise<void> => {
  try {
    // Get page dimensions
    const pageInfo = await nutrientInstance.pageInfoForIndex(pageIndex);
    const { width, height } = pageInfo;

    // Create a rectangle covering the entire page
    const boundingBox = new window.NutrientViewer.Geometry.Rect({
      left: 0,
      top: 0,
      width: width,
      height: height
    });

    // Create a redaction annotation covering the entire page
    const redactionAnnotation = new window.NutrientViewer.Annotations.RedactionAnnotation({
      pageIndex: pageIndex,
      boundingBox: boundingBox,
      rects: window.NutrientViewer.Immutable.List([boundingBox])
    });

    // Add the redaction annotation to the document
    await nutrientInstance.create(redactionAnnotation);
  } catch (err) {
    console.error(`Error redacting page ${pageIndex + 1}:`, err);
    throw err;
  }
};

/**
 * Redacts multiple pages and applies the redactions
 * @param nutrientInstance - The Nutrient viewer instance
 * @param pageIndices - Array of zero-based page indices to redact
 */
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

    console.log(`Successfully redacted ${pageIndices.length} page(s)`);
  } catch (err) {
    console.error("Error redacting pages:", err);
  }
};

/**
 * Parses a page range string and converts it to an array of zero-based page indices
 * @param input - The page range string (e.g., "1-3" or "1,3,5" or "1-3,5,7-9")
 * @param totalPages - The total number of pages in the document
 * @returns Array of zero-based page indices
 * @throws Error if the input format is invalid
 */
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

