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
                videoId: tab === "url" ? urlMeta?.videoId || "" : "",
                displayTitle:
                    tab === "file"
                        ? selectedFile?.name || "업로드한 영상"
                        : urlMeta?.title || urlValue?.trim() || "분석 영상",
            },
        });

        analysisStartedAtRef.current = null;
    }, [analysisResult, navigate, previewKind, previewSrc, selectedFile?.name, tab, urlMeta?.title, urlMeta?.videoId, urlValue]);

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
                    </div>
                </div>
            </div>
        </div>
    );
}
