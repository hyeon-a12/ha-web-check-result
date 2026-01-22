// src/components/LoadingOverlay.jsx
import React from "react";

export default function LoadingOverlay({
    open,
    fileLabel,
    previewSrc,
    stageText,
    progress,
}) {
    return (
        <div className={`loading-overlay ${open ? "show" : ""}`} aria-hidden={open ? "false" : "true"}>
            <div className="loading-box" role="status" aria-live="polite">
                <p className="loading-label">영상을 분석하고 있습니다</p>

                <div className="loading-status-row">
                    <div className="spinner" aria-hidden="true"></div>
                    <p className="loading-file-name">{fileLabel}</p>
                </div>

                <div className={`loading-preview-wrapper ${previewSrc ? "has-image" : ""}`}>
                    {!previewSrc ? (
                        <div className="loading-preview loading-preview--placeholder">No image</div>
                    ) : (
                        <img className="loading-preview" alt="사용자가 업로드한 이미지" src={previewSrc} />
                    )}
                </div>

                <p className="loading-mention">{stageText}</p>

                <div
                    className="loading-progress"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={progress}
                >
                    <div className="loading-progress__bar" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );
}
