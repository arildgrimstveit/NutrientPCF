import * as React from "react";
import { NutrientViewerInstance } from "../types";
import { redactPages, parsePageRange } from "../utils";

interface RedactionDialogProps {
    show: boolean;
    instance: NutrientViewerInstance | null;
    selectedOption: "current" | "all" | "range";
    pageRangeInput: string;
    pageRangeInputRef: React.RefObject<HTMLInputElement>;
    onOptionChange: (option: "current" | "all" | "range") => void;
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
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                    minWidth: "450px",
                    maxWidth: "550px",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <h2 style={{ marginTop: 0, marginBottom: "24px", fontSize: "18px", fontWeight: "normal" }}>
                    Sladd hele sider
                </h2>

                {/* Radio button options */}
                <div style={{ marginBottom: "24px", border: "1px solid #ddd", borderRadius: "4px", overflow: "hidden" }}>
                    {/* Option 1: Current page */}
                    <div
                        onClick={() => onOptionChange("current")}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "auto auto 1fr",
                            gap: "10px",
                            alignItems: "center",
                            minHeight: "40px",
                            padding: "12px",
                            borderBottom: "1px solid #ddd",
                            cursor: "pointer",
                            backgroundColor: selectedOption === "current" ? "#e3f2fd" : "transparent",
                            transition: "background-color 0.2s ease"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <input
                                type="radio"
                                id="redact-current"
                                name="redaction-option"
                                checked={selectedOption === "current"}
                                onChange={() => { }}
                                style={{ cursor: "pointer", margin: 0, pointerEvents: "none" }}
                            />
                        </div>
                        <label htmlFor="redact-current" style={{ fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                            Denne siden (side {currentPage})
                        </label>
                        <div></div>
                    </div>

                    {/* Option 2: All pages */}
                    <div
                        onClick={() => onOptionChange("all")}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "auto auto 1fr",
                            gap: "10px",
                            alignItems: "center",
                            minHeight: "40px",
                            padding: "12px",
                            borderBottom: "1px solid #ddd",
                            cursor: "pointer",
                            backgroundColor: selectedOption === "all" ? "#e3f2fd" : "transparent",
                            transition: "background-color 0.2s ease"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <input
                                type="radio"
                                id="redact-all"
                                name="redaction-option"
                                checked={selectedOption === "all"}
                                onChange={() => { }}
                                style={{ cursor: "pointer", margin: 0, pointerEvents: "none" }}
                            />
                        </div>
                        <label htmlFor="redact-all" style={{ fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                            Alle sider ({totalPages} sider)
                        </label>
                        <div></div>
                    </div>

                    {/* Option 3: Range with input field */}
                    <div
                        onClick={(e) => {
                            // Don't trigger if clicking on the input field
                            if (e.target !== pageRangeInputRef.current) {
                                onOptionChange("range");
                                setTimeout(() => pageRangeInputRef.current?.focus(), 0);
                            }
                        }}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "auto auto 1fr",
                            gap: "10px",
                            alignItems: "center",
                            minHeight: "40px",
                            padding: "12px",
                            cursor: "pointer",
                            backgroundColor: selectedOption === "range" ? "#e3f2fd" : "transparent",
                            transition: "background-color 0.2s ease"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <input
                                type="radio"
                                id="redact-range"
                                name="redaction-option"
                                checked={selectedOption === "range"}
                                onChange={() => { }}
                                style={{ cursor: "pointer", margin: 0, pointerEvents: "none" }}
                            />
                        </div>
                        <label htmlFor="redact-range" style={{ fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", pointerEvents: "none" }}>
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
                            style={{
                                padding: "4px 10px",
                                fontSize: "14px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                height: "28px",
                                boxSizing: "border-box",
                                cursor: "text",
                            }}
                            onKeyPress={(e) => {
                                if (e.key === "Enter" && selectedOption === "range") {
                                    onSubmit();
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Footer buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: "10px 20px",
                            fontSize: "14px",
                            backgroundColor: "white",
                            color: "#333",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={onSubmit}
                        style={{
                            padding: "10px 20px",
                            fontSize: "14px",
                            backgroundColor: "#0078d4",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "500",
                        }}
                    >
                        Sladd
                    </button>
                </div>
            </div>
        </div>
    );
});

RedactionDialog.displayName = "RedactionDialog";

