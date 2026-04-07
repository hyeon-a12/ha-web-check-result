import React from "react";

const PDF_STAGES = [
    { at: 0, text: "리포트 레이아웃 구성 중..." },
    { at: 20, text: "프레임 데이터를 렌더링 중..." },
    { at: 45, text: "히트맵 이미지를 정리 중..." },
    { at: 70, text: "페이지를 PDF로 변환 중..." },
    { at: 90, text: "파일 저장 준비 중..." },
];

function getPdfStageText(progress) {
    let current = PDF_STAGES[0].text;
    for (const stage of PDF_STAGES) {
        if (progress >= stage.at) current = stage.text;
    }
    return current;
}

function SharedLoadingStyles() {
    return (
        <style>{`
            @keyframes lo-spin {
                to { transform: rotate(360deg); }
            }
            @keyframes lo-pulse-ring {
                0% { transform: scale(0.85); opacity: 0.6; }
                50% { transform: scale(1.08); opacity: 0.2; }
                100% { transform: scale(0.85); opacity: 0.6; }
            }
            @keyframes lo-bar-shine {
                0% { left: -60%; }
                100% { left: 120%; }
            }
            @keyframes lo-fadein {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes lo-stage-in {
                from { opacity: 0; transform: translateX(-8px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes lo-dot {
                0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
                40% { transform: scale(1); opacity: 1; }
            }

            .lo-wrap {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                animation: lo-fadein 0.35s ease both;
            }
            .lo-spinner-wrap {
                position: relative;
                width: 88px;
                height: 88px;
                margin-bottom: 28px;
                flex-shrink: 0;
            }
            .lo-pulse-ring {
                position: absolute;
                inset: -10px;
                border-radius: 50%;
                border: 2px solid rgba(96, 165, 250, 0.35);
                animation: lo-pulse-ring 2s ease-in-out infinite;
            }
            .lo-orbit {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                border: 2.5px solid transparent;
                border-top-color: #60a5fa;
                border-right-color: rgba(96,165,250,0.4);
                animation: lo-spin 1s linear infinite;
            }
            .lo-orbit-inner {
                position: absolute;
                inset: 10px;
                border-radius: 50%;
                border: 2px solid transparent;
                border-bottom-color: #818cf8;
                animation: lo-spin 1.6s linear infinite reverse;
            }
            .lo-icon-circle {
                position: absolute;
                inset: 18px;
                border-radius: 50%;
                background: linear-gradient(135deg, #1e3a5f, #1e293b);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                color: #fff;
                box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            }
            .lo-title {
                font-size: 17px;
                font-weight: 800;
                color: #1e3a5f;
                margin: 0 0 6px;
                letter-spacing: -0.02em;
            }
            .lo-subtitle {
                font-size: 11px;
                color: #64748b;
                max-width: 280px;
                text-align: center;
                line-height: 1.6;
                margin: 0 0 22px;
            }
            .lo-stage {
                font-size: 13px;
                color: #2563eb;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 14px;
                animation: lo-stage-in 0.3s ease both;
                min-height: 20px;
                text-align: center;
            }
            .lo-stage-dot {
                display: inline-block;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #60a5fa;
                animation: lo-dot 1.2s ease-in-out infinite both;
            }
            .lo-stage-dot:nth-child(2) { animation-delay: 0.15s; }
            .lo-stage-dot:nth-child(3) { animation-delay: 0.30s; }
            .lo-progress-wrap {
                width: 100%;
                max-width: 320px;
            }
            .lo-progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .lo-progress-label {
                font-size: 11px;
                color: #475569;
            }
            .lo-progress-pct {
                font-size: 13px;
                font-weight: 800;
                color: #2563eb;
                font-variant-numeric: tabular-nums;
            }
            .lo-bar-track {
                width: 100%;
                height: 6px;
                background: rgba(255,255,255,0.07);
                border-radius: 999px;
                overflow: hidden;
                position: relative;
            }
            .lo-bar-fill {
                height: 100%;
                border-radius: 999px;
                background: linear-gradient(90deg, #2563eb, #60a5fa, #818cf8);
                transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            .lo-bar-shine {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 60%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
                animation: lo-bar-shine 1.4s linear infinite;
            }
            .lo-tip {
                margin-top: 20px;
                font-size: 11px;
                color: #334155;
                text-align: center;
                line-height: 1.6;
            }

            .lo-analysis-head {
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 18px;
            }
            .lo-analysis-close {
                width: 32px;
                height: 32px;
                border: 0;
                border-radius: 999px;
                background: rgba(148, 163, 184, 0.14);
                color: #475569;
                font-size: 18px;
                cursor: pointer;
            }
            .lo-analysis-media-shell {
                width: 100%;
                padding: 14px;
                border-radius: 24px;
                background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(241,245,249,0.92));
                border: 1px solid rgba(148,163,184,0.24);
                box-shadow: 0 12px 30px rgba(15,23,42,0.08);
                margin-bottom: 20px;
            }
            .lo-analysis-media-frame {
                width: 100%;
                aspect-ratio: 16 / 9;
                border-radius: 18px;
                overflow: hidden;
                background: linear-gradient(135deg, #0f172a, #1e293b);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .lo-analysis-media {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
                background: transparent;
            }
            .lo-analysis-placeholder {
                color: #cbd5e1;
                font-size: 13px;
                font-weight: 700;
            }
            .lo-analysis-file {
                margin: 14px 2px 0;
                font-size: 13px;
                font-weight: 700;
                color: #334155;
                text-align: center;
                line-height: 1.5;
                word-break: break-word;
            }
        `}</style>
    );
}

function PdfLoadingContent({ progress, fileName }) {
    const stageText = getPdfStageText(progress);
    const clamped = Math.min(Math.max(progress, 0), 100);

    return (
        <>
            <SharedLoadingStyles />
            <div className="lo-wrap">
                <div className="lo-spinner-wrap">
                    <div className="lo-pulse-ring" />
                    <div className="lo-orbit" />
                    <div className="lo-orbit-inner" />
                    <div className="lo-icon-circle">PDF</div>
                </div>

                <p className="lo-title">PDF 리포트 생성 중</p>
                {fileName && <p className="lo-subtitle">{fileName}</p>}

                <div className="lo-stage" key={stageText}>
                    <span className="lo-stage-dot" />
                    <span className="lo-stage-dot" />
                    <span className="lo-stage-dot" />
                    {stageText}
                </div>

                <div className="lo-progress-wrap">
                    <div className="lo-progress-header">
                        <span className="lo-progress-label">진행률</span>
                        <span className="lo-progress-pct">{clamped}%</span>
                    </div>
                    <div className="lo-bar-track">
                        <div className="lo-bar-fill" style={{ width: `${clamped}%` }}>
                            <div className="lo-bar-shine" />
                        </div>
                    </div>
                </div>

                <p className="lo-tip">
                    창을 닫거나 이동하지 마세요.
                    <br />
                    분석 내용이 많을수록 시간이 더 걸릴 수 있습니다.
                </p>
            </div>
        </>
    );
}

function AnalysisLoadingContent({
    progress,
    fileLabel,
    previewSrc,
    previewKind,
    stageText,
    onClose,
}) {
    const clamped = Math.min(Math.max(progress, 0), 100);

    return (
        <>
            <SharedLoadingStyles />
            <div className="lo-wrap">
                <div className="lo-analysis-head">
                    <p className="lo-title" style={{ marginBottom: 0 }}>영상 분석 진행 중</p>
                    <button className="lo-analysis-close" onClick={onClose} aria-label="닫기">
                        ×
                    </button>
                </div>

                <div className="lo-analysis-media-shell">
                    <div className="lo-analysis-media-frame">
                        {!previewSrc ? (
                            <div className="lo-analysis-placeholder">미리보기 없음</div>
                        ) : previewKind === "video" ? (
                            <video className="lo-analysis-media" src={previewSrc} muted controls />
                        ) : (
                            <img className="lo-analysis-media" alt="분석 미리보기" src={previewSrc} />
                        )}
                    </div>
                    <p className="lo-analysis-file">{fileLabel}</p>
                </div>

                <div className="lo-stage" key={stageText}>
                    <span className="lo-stage-dot" />
                    <span className="lo-stage-dot" />
                    <span className="lo-stage-dot" />
                    {stageText}
                </div>

                <div className="lo-progress-wrap">
                    <div className="lo-progress-header">
                        <span className="lo-progress-label">진행률</span>
                        <span className="lo-progress-pct">{clamped}%</span>
                    </div>
                    <div className="lo-bar-track">
                        <div className="lo-bar-fill" style={{ width: `${clamped}%` }}>
                            <div className="lo-bar-shine" />
                        </div>
                    </div>
                </div>

                <p className="lo-tip">
                    분석이 끝나면 결과 화면으로 자동 이동합니다.
                    <br />
                    영상 길이와 서버 상태에 따라 시간이 더 걸릴 수 있습니다.
                </p>
            </div>
        </>
    );
}

export default function LoadingOverlay({
    open,
    fileLabel,
    previewSrc,
    previewKind = "image",
    stageText,
    progress,
    onClose,
    mode = "analysis",
    pdfProgress = 0,
    pdfFileName = "",
}) {
    return (
        <div className={`loading-overlay ${open ? "show" : ""}`} aria-hidden={open ? "false" : "true"}>
            <div className="loading-box" role="status" aria-live="polite">
                {mode === "pdf" ? (
                    <PdfLoadingContent progress={pdfProgress} fileName={pdfFileName} />
                ) : (
                    <AnalysisLoadingContent
                        progress={progress}
                        fileLabel={fileLabel}
                        previewSrc={previewSrc}
                        previewKind={previewKind}
                        stageText={stageText}
                        onClose={onClose}
                    />
                )}
            </div>
        </div>
    );
}
