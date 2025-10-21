import * as React from "react";
import NutrientViewerComponent from "./NutrientViewerComponent";

// Example component for local testing of NutrientViewerComponent
const ExampleUsage: React.FC = () => {
    const [pdfBase64, setPdfBase64] = React.useState<string>("");
    const [pdfUrl, setPdfUrl] = React.useState<string>("");

    // Handle file upload and convert to Base64
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setPdfBase64(result);
            setPdfUrl(""); // Clear URL when using Base64
        };
        reader.readAsDataURL(file);
    };

    // Handle URL input
    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const url = event.target.value;
        setPdfUrl(url);
        setPdfBase64(""); // Clear Base64 when using URL
    };

    // Handle save callback
    const handleSave = (savedPdfBase64: string) => {
        downloadBase64AsPDF(savedPdfBase64, "redacted-document.pdf");
    };

    // Utility function to download Base64 as PDF
    const downloadBase64AsPDF = (base64: string, filename: string) => {
        console.log("Starting download, filename:", filename);
        try {
            // Ensure we have a proper data URL format
            const dataUrl = base64.startsWith('data:') ? base64 : `data:application/pdf;base64,${base64}`;

            // Create blob from base64
            const byteCharacters = atob(dataUrl.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            console.log("Blob created, size:", blob.size);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.style.display = "none";

            console.log("Triggering download...");

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log("Download completed");
        } catch (error) {
            console.error("Error downloading PDF:", error);
            // Fallback to simple method
            const dataUrl = base64.startsWith('data:') ? base64 : `data:application/pdf;base64,${base64}`;
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = filename;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log("Fallback download completed");
        }
    };

    return (
        <div style={{
            padding: "20px",
            fontFamily: "Arial, sans-serif",
            height: "100%",
            display: "flex",
            flexDirection: "column"
        }}>
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <h3 style={{ fontSize: "18px" }}>Upload PDF File</h3>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        id="pdf-upload"
                        style={{
                            padding: "8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            backgroundColor: "white",
                            fontSize: "14px",
                            minWidth: "200px"
                        }}
                    />
                    <label htmlFor="pdf-upload" style={{
                        padding: "8px 16px",
                        backgroundColor: "#0078d4",
                        color: "white",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        border: "none"
                    }}>
                        Choose PDF File
                    </label>
                </div>
            </div>

            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "18px" }}>
                    Upload PDF from URL
                </h3>
                <input
                    type="url"
                    value={pdfUrl}
                    onChange={handleUrlChange}
                    style={{
                        width: "100%",
                        maxWidth: "500px",
                        padding: "8px",
                        marginBottom: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        display: "block",
                        margin: "0 auto"
                    }}
                />
            </div>

            {/* PDF Viewer Component */}
            <div style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%"
            }}>
                <NutrientViewerComponent
                    documentBase64={pdfBase64 || undefined}
                    documentUrl={pdfUrl || undefined}
                    viewerHeight={800}
                    viewerWidth={1200}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
};

export default ExampleUsage;
