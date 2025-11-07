/* eslint-disable react/prop-types */
// prop-types validation is disabled because TypeScript interfaces provide superior type checking
import * as React from "react";
import { NutrientViewerInstance } from "../types";
import "./RedactionDialog.css";

interface RedactionDialogProps {
    show: boolean;
    instance: NutrientViewerInstance | null;
    selectedOption: "current" | "range";
    pageRangeInput: string;
    pageRangeInputRef: React.RefObject<HTMLInputElement>;
    errorMessage: string;
    onOptionChange: (option: "current" | "range") => void;
    onPageRangeChange: (value: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
}

/**
 * Dialog component for selecting and applying page redactions
 */
export const RedactionDialog: React.FC<RedactionDialogProps> = React.memo(({
    show,
    instance,
    selectedOption,
    pageRangeInput,
    pageRangeInputRef,
    errorMessage,
    onOptionChange,
    onPageRangeChange,
    onCancel,
    onSubmit,
}) => {
    if (!show || !instance) return null;

    const totalPages = instance.totalPageCount ?? 0;
    const currentPage = instance.viewState.currentPageIndex + 1;

    return (
        <div
            key="redaction-dialog"
            className="redaction-dialog-overlay"
            onClick={onCancel}
        >
            <div
                className="redaction-dialog-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <h2 className="redaction-dialog-header">
                    Sladd hele sider
                </h2>

                {/* Radio button options */}
                <div className="redaction-options-container">
                    {/* Option 1: Current page */}
                    <div
                        onClick={() => onOptionChange("current")}
                        className={`redaction-option ${selectedOption === "current" ? "selected" : ""}`}
                    >
                        <div className="redaction-option-radio-container">
                            <input
                                type="radio"
                                id="redact-current"
                                name="redaction-option"
                                checked={selectedOption === "current"}
                                readOnly
                                className="redaction-option-radio"
                            />
                        </div>
                        <label htmlFor="redact-current" className="redaction-option-label">
                            Denne siden (side {currentPage})
                        </label>
                        <div></div>
                    </div>

                    {/* Option 2: Range with input field */}
                    <div
                        onClick={(e) => {
                            // Don't trigger if clicking on the input field
                            if (e.target !== pageRangeInputRef.current) {
                                onOptionChange("range");
                                setTimeout(() => pageRangeInputRef.current?.focus(), 0);
                            }
                        }}
                        className={`redaction-option ${selectedOption === "range" ? "selected" : ""}`}
                    >
                        <div className="redaction-option-radio-container">
                            <input
                                type="radio"
                                id="redact-range"
                                name="redaction-option"
                                checked={selectedOption === "range"}
                                readOnly
                                className="redaction-option-radio"
                            />
                        </div>
                        <label htmlFor="redact-range" className="redaction-option-label">
                            Sideområde:
                        </label>
                        <input
                            key="page-range-input"
                            ref={pageRangeInputRef}
                            type="text"
                            value={pageRangeInput}
                            onChange={(e) => onPageRangeChange(e.target.value)}
                            onFocus={() => {
                                if (selectedOption !== "range") {
                                    onOptionChange("range");
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="f.eks. 1-3 eller 1,3,5"
                            className="page-range-input"
                            onKeyPress={(e) => {
                                if (e.key === "Enter" && selectedOption === "range") {
                                    onSubmit();
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Error message */}
                {errorMessage && (
                    <div className="error-message">
                        {errorMessage}
                    </div>
                )}

                {/* Footer buttons */}
                <div className="dialog-footer">
                    <button
                        onClick={onCancel}
                        className="cancel-button"
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={onSubmit}
                        className="submit-button"
                    >
                        Sladd
                    </button>
                </div>
            </div>
        </div>
    );
});

RedactionDialog.displayName = "RedactionDialog";

