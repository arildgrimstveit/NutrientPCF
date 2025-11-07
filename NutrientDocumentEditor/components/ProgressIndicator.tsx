import * as React from "react";
import "./ProgressIndicator.css";

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
        <div className="progress-indicator">
            <div className="progress-title">
                Laster PDF...
            </div>
            <div className="progress-bar-container">
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${progress}%`,
                    }}
                />
            </div>
            {loadingProgress && (
                <div className="progress-details">
                    {Math.round(loadingProgress.loaded / 1024 / 1024 * 100) / 100}MB / {Math.round(loadingProgress.total / 1024 / 1024 * 100) / 100}MB
                </div>
            )}
        </div>
    );
};

