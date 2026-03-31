import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import DropzoneUpload from "../components/DropzoneUpload";
import LoadingOverlay from "../components/LoadingOverlay";
import { analyzeVideoFile, analyzeVideoLink, fetchYoutubeInfo } from "../services/api";

export default function HomePage() {
    const navigate = useNavigate();

    const [tab, setTab] = useState("file");
    const dropzoneRef = useRef(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState("");
    const [previewKind, setPreviewKind] = useState("image");

    const [urlValue, setUrlValue] = useState("");
    const [urlMeta, setUrlMeta] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);

    const [loadingOpen, setLoadingOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stageText, setStageText] = useState("분석을 위한 데이터 전처리를 진행 중입니다");

    const stages = useMemo(
        () => [
            { threshold: 0, text: "분석을 위한 데이터 전처리를 진행 중입니다" },
            { threshold: 35, text: "프레임 및 음성 구간별 정밀 분석을 진행 중입니다" },
            { threshold: 70, text: "최종 분석 리포트를 생성하고 있습니다" },
        ],
        []
    );

    const canAnalyze = tab === "file" ? Boolean(selectedFile) : Boolean(urlValue.trim());

    const onAnalyzeClick = async () => {
        if (!canAnalyze) {
            alert(tab === "file" ? "파일을 선택해 주세요." : "URL을 입력해 주세요.");
            return;
        }

        if (tab === "url") {
            setUrlMeta(null);
            setAnalysisResult(null);
            setPreviewSrc("");
            setPreviewKind("image");

            try {
                const info = await fetchYoutubeInfo(urlValue.trim());
                setUrlMeta(info);
                setPreviewSrc(info.thumbnail || "");
                setPreviewKind("image");
                setLoadingOpen(true);

                const analysis = await analyzeVideoLink(urlValue.trim());
                setAnalysisResult({
                    ...info,
                    ...analysis,
                });
            } catch (error) {
                console.error(error);
                alert(error?.message || "URL 분석 중 오류가 발생했습니다.");
                setLoadingOpen(false);
            }

            return;
        }

        setAnalysisResult(null);
        setLoadingOpen(true);

        try {
            const analysis = await analyzeVideoFile(selectedFile);
            setAnalysisResult(analysis);
        } catch (error) {
            console.error(error);
            alert(error?.message || "파일 분석 중 오류가 발생했습니다.");
            setLoadingOpen(false);
        }
    };

    const loadingFileLabel =
        tab === "file"
            ? selectedFile?.name ?? "파일을 선택해 주세요"
            : urlMeta?.title || urlValue?.trim() || "URL을 입력해 주세요";

    useEffect(() => {
        if (!loadingOpen) return;

        setProgress(0);
        setStageText(stages[0].text);

        let p = 0;
        const timer = setInterval(() => {
            const waitingForAnalysis = !analysisResult;
            p = waitingForAnalysis ? Math.min(p + 5, 95) : Math.min(p + 5, 100);
            setProgress(p);

            for (let i = stages.length - 1; i >= 0; i -= 1) {
                if (p >= stages[i].threshold) {
                    setStageText(stages[i].text);
                    break;
                }
            }

            if (p >= 100) {
                clearInterval(timer);
                setTimeout(() => {
                    setLoadingOpen(false);
                    navigate("/gallery", {
                        state: {
                            analysis: analysisResult,
                            previewSrc,
                            previewKind,
                            //유튜브 영상 재생하기 : URL 분석 결과에서 받은 videoId를 gallery 페이지로 넘겨 임베드 플레이어를 띄운다.
                            videoId: tab === "url" ? urlMeta?.videoId || "" : "",
                            displayTitle:
                                tab === "file"
                                    ? selectedFile?.name || "업로드한 영상"
                                    : urlMeta?.title || urlValue?.trim() || "분석한 영상",
                        },
                    });
                }, 200);
            }
        }, 120);

        return () => clearInterval(timer);
    }, [analysisResult, loadingOpen, navigate, previewKind, previewSrc, selectedFile, stages, tab, urlMeta, urlValue]);

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
                                당신이 보고있는 영상,<br />
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
                                딥러닝 기술로 영상의 위변조 여부를 분석하고,
                                <br /> 의심 구간과 근거를 명확하게 제시합니다.
                            </p>
                        </div>

                        <LoadingOverlay
                            open={loadingOpen}
                            fileLabel={loadingFileLabel}
                            previewSrc={previewSrc}
                            previewKind={previewKind}
                            stageText={stageText}
                            progress={progress}
                            onClose={() => setLoadingOpen(false)}
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
                                    url 입력
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
                                                유튜브/트위터 등 영상 링크를 입력하면 분석을 시작할 수 있어요.
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
