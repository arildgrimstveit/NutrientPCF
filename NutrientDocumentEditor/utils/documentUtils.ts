/**
 * Document conversion utilities for handling Base64 and ArrayBuffer conversions
 */

/**
 * Converts a Base64 string to an ArrayBuffer
 * @param base64String - The Base64 encoded string to convert
 * @returns ArrayBuffer representation of the Base64 string
 */
export const convertBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  try {
    const rawBase64 = base64String.includes(",")
      ? base64String.split(",")[1]
      : base64String;
    const binaryString = window.atob(rawBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Error converting Base64 to ArrayBuffer:", error);
    return new ArrayBuffer(0);
  }
};

/**
 * Fetches a document from a URL with optional progress tracking
 * @param url - The URL to fetch the document from
 * @param onProgress - Optional callback for tracking download progress
 * @returns Promise resolving to the document as an ArrayBuffer
 */
export const fetchDocumentFromUrl = async (
  url: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (onProgress && total > 0) {
        onProgress(loaded, total);
      }
    }

    // Combine all chunks into a single ArrayBuffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  } catch (error) {
    console.error("Error fetching document from URL:", error);
    throw error;
  }
};

/**
 * Converts an ArrayBuffer to a Base64 encoded string
 * @param buffer - The ArrayBuffer to convert
 * @returns Base64 encoded string with data URL prefix
 */
export const convertArrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  try {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return "data:application/pdf;base64," + btoa(binary);
  } catch (error) {
    console.error("Error converting ArrayBuffer to Base64:", error);
    return "";
  }
};

