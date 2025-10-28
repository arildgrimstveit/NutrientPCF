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
                top: "16px",
                right: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                padding: "12px 16px",
                borderRadius: "6px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                textAlign: "left",
                zIndex: 1000,
                minWidth: "200px",
            }}
        >
            <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#323130" }}>
                Laster PDF...
            </div>
            <div style={{ width: "100%", height: "4px", backgroundColor: "#e0e0e0", borderRadius: "2px", overflow: "hidden" }}>
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
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#666" }}>
                    {Math.round(loadingProgress.loaded / 1024 / 1024 * 100) / 100}MB / {Math.round(loadingProgress.total / 1024 / 1024 * 100) / 100}MB
                </div>
            )}
        </div>
    );
};

