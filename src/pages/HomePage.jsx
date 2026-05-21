import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import DropzoneUpload from "../components/DropzoneUpload";
import LoadingOverlay from "../components/LoadingOverlay";
import { analyzeVideoFile, analyzeVideoLink, fetchYoutubeInfo } from "../services/api";

const ANALYSIS_STAGES = [
    { threshold: 0, text: "분석을 위한 데이터를 준비하고 있습니다" },
    { threshold: 35, text: "프레임 흐름과 위험 구간을 분석하고 있습니다" },
    { threshold: 70, text: "최종 결과를 정리하고 있습니다" },
];

const MODELS = [
    {
        id: "EfficientNet",
        label: "EfficientNet",
        desc: "균형 잡힌 종합 분석 모델",
    },
    {
        id: "Diffusion",
        label: "Diffusion",
        desc: "고정밀 딥페이크 특화 모델",
    },
];

function ModelDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const current = MODELS.find((item) => item.id === value) ?? MODELS[0];

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    return (
        <>
            <style>{`
                .mdl-wrap {
                    position: relative;
                    display: inline-block;
                }
                .mdl-trigger {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 12px 7px 10px;
                    border-radius: 8px;
                    border: none;
                    background: #2a2a2a;
                    color: #fff;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.15s;
                    white-space: nowrap;
                    font-family: inherit;
                    line-height: 1;
                    transform: translateY(-40px);
                }
                .mdl-trigger:hover { background: #333; }
                .mdl-trigger-icon { font-size: 15px; line-height: 1; }
                .mdl-trigger-chevron {
                    font-size: 10px;
                    opacity: 0.7;
                    transition: transform 0.2s;
                    display: inline-block;
                }
                .mdl-trigger-chevron.up { transform: rotate(180deg); }
                .mdl-panel {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    right: 0;
                    min-width: 240px;
                    background: #1e1e1e;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 14px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
                    overflow: hidden;
                    z-index: 200;
                    animation: mdlIn 0.18s cubic-bezier(.22,1,.36,1) both;
                }
                @keyframes mdlIn {
                    from { opacity: 0; transform: translateY(6px) scale(0.97); }
                    to { opacity: 1; transform: none; }
                }

                .mdl-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    cursor: pointer;
                    transition: background 0.12s;
                    gap: 10px;
                }
                .mdl-item:hover { background: rgba(255,255,255,0.06); }
                .mdl-item-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                }
                .mdl-item-icon { font-size: 20px; line-height: 1; flex-shrink: 0; }
                .mdl-item-text { flex: 1; min-width: 0; }
                .mdl-item-name { font-size: 15px; font-weight: 600; color: #fff; line-height: 1.3; }
                .mdl-item-desc { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 2px; }
                .mdl-check {
                    color: #4f8ef7;
                    font-size: 16px;
                    flex-shrink: 0;
                    opacity: 0;
                    transition: opacity 0.15s;
                }
                .mdl-check.visible { opacity: 1; }
                .mdl-divider {
                    height: 1px;
                    background: rgba(255,255,255,0.08);
                    margin: 0 16px;
                }
                .mdl-more {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 13px 16px;
                    cursor: pointer;
                    transition: background 0.12s;
                }
                .mdl-more:hover { background: rgba(255,255,255,0.06); }
                .mdl-more-label { font-size: 14px; color: rgba(255,255,255,0.65); font-weight: 500; }
                .mdl-more-arrow { font-size: 14px; color: rgba(255,255,255,0.4); }
            `}</style>

            <div className="mdl-wrap" ref={wrapRef}>
                {open && (
                    <div className="mdl-panel">
                        {MODELS.map((model, index) => (
                            <React.Fragment key={model.id}>
                                {index > 0 && <div className="mdl-divider" />}
                                <div
                                    className="mdl-item"
                                    onClick={() => {
                                        onChange(model.id);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="mdl-item-left">
                                        <span className="mdl-item-icon">{model.icon}</span>
                                        <div className="mdl-item-text">
                                            <div className="mdl-item-name">{model.label}</div>
                                            <div className="mdl-item-desc">{model.desc}</div>
                                        </div>
                                    </div>
                                    <span className={`mdl-check${value === model.id ? " visible" : ""}`}>✓</span>
                                </div>
                            </React.Fragment>
                        ))}
                        <div className="mdl-divider" />
                        {/* <div className="mdl-more" onClick={() => setOpen(false)}>
                            <span className="mdl-more-label">더 많은 모델</span>
                            <span className="mdl-more-arrow">›</span>
                        </div> */}
                    </div>
                )}

                <button
                    type="button"
                    className="mdl-trigger"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    <span className="mdl-trigger-icon">{current.icon}</span>
                    {current.label}
                    <span className={`mdl-trigger-chevron${open ? " up" : ""}`}>▼</span>
                </button>
            </div>
        </>
    );
}

function getStageText(progress) {
    let current = ANALYSIS_STAGES[0].text;
    for (const stage of ANALYSIS_STAGES) {
        if (progress >= stage.threshold) current = stage.text;
    }
    return current;
}

export default function HomePage() {
    const navigate = useNavigate();

    const [tab, setTab] = useState("file");
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const dropzoneRef = useRef(null);
    const analysisStartedAtRef = useRef(null);
    const progressTimerRef = useRef(null);
    const finishTimerRef = useRef(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState("");
    const [previewKind, setPreviewKind] = useState("image");

    const [urlValue, setUrlValue] = useState("");
    const [urlMeta, setUrlMeta] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);

    const [loadingOpen, setLoadingOpen] = useState(false);
    const [progress, setProgress] = useState(0);

    const stageText = useMemo(() => getStageText(progress), [progress]);
    const canAnalyze = tab === "file" ? Boolean(selectedFile) : Boolean(urlValue.trim());

    const clearLoadingTimers = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }

        if (finishTimerRef.current) {
            clearTimeout(finishTimerRef.current);
            finishTimerRef.current = null;
        }
    };

    const resetLoadingState = () => {
        clearLoadingTimers();
        setProgress(0);
        setAnalysisResult(null);
    };

    const navigateToGallery = useCallback(() => {
        const elapsedSeconds = analysisStartedAtRef.current == null
            ? null
            : (performance.now() - analysisStartedAtRef.current) / 1000;
        const analysisPayload = analysisResult && elapsedSeconds != null
            ? {
                ...analysisResult,
                analysis_time: `${elapsedSeconds.toFixed(1)}초`,
            }
            : analysisResult;

        setLoadingOpen(false);
        clearLoadingTimers();

        navigate("/gallery", {
            state: {
                analysis: analysisPayload,
                analysisStartedAt: analysisStartedAtRef.current,
                previewSrc,
                previewKind,
                sourceType: tab,
                sourceUrl: tab === "url" ? urlValue.trim() : "",
                videoId: tab === "url" ? urlMeta?.videoId || "" : "",
                selectedModel,
                displayTitle:
                    tab === "file"
                        ? selectedFile?.name || "업로드한 영상"
                        : urlMeta?.title || urlValue?.trim() || "분석 영상",
            },
        });

        analysisStartedAtRef.current = null;
    }, [analysisResult, navigate, previewKind, previewSrc, selectedFile?.name, selectedModel, tab, urlMeta?.title, urlMeta?.videoId, urlValue]);

    const startProgressSimulation = () => {
        if (progressTimerRef.current) return;

        const startedAt = performance.now();
        const tickMs = 120;
        const softCap = 92;
        const totalMs = 9000;

        progressTimerRef.current = setInterval(() => {
            const elapsed = performance.now() - startedAt;
            const t = Math.min(elapsed / totalMs, 1);
            const eased = softCap * (1 - Math.pow(1 - t, 3));
            const nextValue = Math.min(softCap, Math.round(eased));

            setProgress((prev) => Math.max(prev, nextValue));

            if (nextValue >= softCap) {
                clearInterval(progressTimerRef.current);
                progressTimerRef.current = null;
            }
        }, tickMs);
    };

    const onAnalyzeClick = async () => {
        if (!canAnalyze) {
            alert(tab === "file" ? "파일을 선택해주세요." : "URL을 입력해주세요.");
            return;
        }

        analysisStartedAtRef.current = performance.now();
        resetLoadingState();

        if (tab === "url") {
            setUrlMeta(null);
            setPreviewSrc("");
            setPreviewKind("image");

            try {
                const info = await fetchYoutubeInfo(urlValue.trim());
                setUrlMeta(info);
                setPreviewSrc(info.thumbnail || "");
                setPreviewKind("image");
                setLoadingOpen(true);
                startProgressSimulation();

                const analysis = await analyzeVideoLink(urlValue.trim());
                setAnalysisResult({
                    ...info,
                    ...analysis,
                });
            } catch (error) {
                console.error(error);
                alert(error?.message || "URL 분석 중 오류가 발생했습니다.");
                setLoadingOpen(false);
                clearLoadingTimers();
                analysisStartedAtRef.current = null;
            }

            return;
        }

        setLoadingOpen(true);
        startProgressSimulation();

        try {
            const analysis = await analyzeVideoFile(selectedFile);
            setAnalysisResult(analysis);
        } catch (error) {
            console.error(error);
            alert(error?.message || "파일 분석 중 오류가 발생했습니다.");
            setLoadingOpen(false);
            clearLoadingTimers();
            analysisStartedAtRef.current = null;
        }
    };

    const loadingFileLabel =
        tab === "file"
            ? selectedFile?.name ?? "파일을 선택해주세요."
            : urlMeta?.title || "영상 정보를 불러오는 중입니다";

    useEffect(() => {
        if (!loadingOpen || !analysisResult) return undefined;

        clearLoadingTimers();
        setProgress((prev) => Math.max(prev, 100));

        finishTimerRef.current = setTimeout(() => {
            navigateToGallery();
        }, 260);

        return () => {
            if (finishTimerRef.current) {
                clearTimeout(finishTimerRef.current);
                finishTimerRef.current = null;
            }
        };
    }, [analysisResult, loadingOpen, navigateToGallery]);

    useEffect(() => () => clearLoadingTimers(), []);

    const onClickFileTab = () => {
        setTab("file");
        setTimeout(() => dropzoneRef.current?.openPicker?.(), 0);
    };

    const onClickUrlTab = () => {
        setTab("url");
    };

    return (
        <div id="main">
            <div className="wrap">
                <div className="box" id="homeUI">
                    <div className="left">
                        <div className="title">
                            <h1>
                                당신이 보고 있는 영상,
                                <br />
                                <span style={{ color: "#000" }}>
                                    <span
                                        style={{
                                            backgroundImage: "linear-gradient(to right, blue, skyblue)",
                                            backgroundClip: "text",
                                            WebkitBackgroundClip: "text",
                                            color: "transparent",
                                        }}
                                    >
                                        진짜인지
                                    </span>{" "}
                                    확인하세요
                                </span>
                            </h1>
                            <p>
                                포렌식 기술로 영상의 위변조 여부를 분석하고,
                                <br /> 수상 구간과 그 근거를 명확하게 제시합니다.
                            </p>
                        </div>

                        <LoadingOverlay
                            open={loadingOpen}
                            fileLabel={loadingFileLabel}
                            previewSrc={previewSrc}
                            previewKind={previewKind}
                            stageText={stageText}
                            progress={progress}
                            onClose={() => {
                                setLoadingOpen(false);
                                clearLoadingTimers();
                            }}
                        />
                    </div>

                    <div className="right">
                        <div className="tabs">
                            <div className="left">
                                <label
                                    role="button"
                                    tabIndex={0}
                                    onClick={onClickFileTab}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") onClickFileTab();
                                    }}
                                    style={{
                                        backgroundColor: tab === "file" ? "rgb(73, 105, 219)" : undefined,
                                    }}
                                >
                                    파일 업로드
                                </label>

                                <label
                                    role="button"
                                    tabIndex={0}
                                    onClick={onClickUrlTab}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") onClickUrlTab();
                                    }}
                                    style={{
                                        backgroundColor: tab === "url" ? "rgb(73, 105, 219)" : undefined,
                                    }}
                                >
                                    URL 입력
                                </label>
                            </div>

                            <div className="btn">
                                <button id="analyzeBtn" type="button" onClick={onAnalyzeClick}>
                                    분석하기
                                </button>
                            </div>
                        </div>

                        <div className="tab-box" id="analyzeUI">
                            {tab === "file" && (
                                <DropzoneUpload
                                    ref={dropzoneRef}
                                    onChange={(file, src, kind) => {
                                        setSelectedFile(file);
                                        setPreviewSrc(src);
                                        setPreviewKind(kind || "image");
                                    }}
                                />
                            )}

                            {tab === "url" && (
                                <div className="tb tb-url" style={{ display: "block" }}>
                                    <div className="url-panel">
                                        <div className="url-head">
                                            <p className="url-title">URL 붙여넣기</p>
                                            <p className="url-sub">
                                                유튜브 영상 링크를 입력하면 분석이 시작됩니다
                                            </p>
                                        </div>

                                        <div className="url-field">
                                            <span className="url-icon"></span>
                                            <input
                                                type="text"
                                                id="urlInput"
                                                className="url-box"
                                                placeholder="https://..."
                                                value={urlValue}
                                                onChange={(e) => {
                                                    setUrlValue(e.target.value);
                                                    setUrlMeta(null);
                                                    setPreviewSrc("");
                                                    setPreviewKind("image");
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") onAnalyzeClick();
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="url-clear"
                                                aria-label="clear"
                                                onClick={() => {
                                                    setUrlValue("");
                                                    setUrlMeta(null);
                                                    setPreviewSrc("");
                                                    setPreviewKind("image");
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <p className="url-hint">예: https://www.youtube.com/watch?v=...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                            <ModelDropdown value={selectedModel} onChange={setSelectedModel} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
