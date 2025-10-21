import * as React from "react";

interface ProgressIndicatorProps {
    isLoading: boolean;
    loadingProgress: { loaded: number; total: number } | null;
}

/**
 * Progress indicator component that displays document loading progress
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    isLoading,
    loadingProgress,
}) => {
    if (!isLoading) return null;

    const progress = loadingProgress
        ? Math.round((loadingProgress.loaded / loadingProgress.total) * 100)
        : 0;

    return (
        <div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                textAlign: "center",
                zIndex: 1000,
            }}
        >
            <div style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}>
                Loading Document...
            </div>
            <div style={{ width: "200px", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: "#0078d4",
                        transition: "width 0.3s ease",
                    }}
                />
            </div>
            {loadingProgress && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                    {Math.round(loadingProgress.loaded / 1024 / 1024 * 100) / 100}MB / {Math.round(loadingProgress.total / 1024 / 1024 * 100) / 100}MB
                </div>
            )}
        </div>
    );
};

