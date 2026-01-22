// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import DropzoneUpload from "../components/DropzoneUpload";
import LoadingOverlay from "../components/LoadingOverlay";

export default function HomePage() {
    const navigate = useNavigate();

    // 탭 상태
    const [tab, setTab] = useState("file"); // "file" | "url"

    // DropzoneUpload를 탭 클릭 시 강제로 openPicker() 하기 위한 ref
    const dropzoneRef = useRef(null);

    // 업로드 파일/미리보기 (DropzoneUpload에서 올라오는 값 저장)
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState("");

    // URL 입력
    const [urlValue, setUrlValue] = useState("");

    // 로딩 오버레이(진행바)
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

    // 분석 가능 여부
    const canAnalyze = tab === "file" ? Boolean(selectedFile) : Boolean(urlValue.trim());

    // "분석하기" 클릭 → 로딩 시작
    const onAnalyzeClick = () => {
        if (!canAnalyze) {
            alert(tab === "file" ? "이미지 파일을 선택해 주세요." : "URL을 입력해 주세요.");
            return;
        }
        setLoadingOpen(true);
    };

    // 로딩에 표시될 라벨
    const loadingFileLabel =
        tab === "file"
            ? selectedFile?.name ?? "파일을 선택해 주세요"
            : urlValue?.trim() || "URL을 입력해 주세요";

    // 로딩 진행바 시뮬레이션 + 완료 시 gallery로 이동
    useEffect(() => {
        if (!loadingOpen) return;

        setProgress(0);
        setStageText(stages[0].text);

        let p = 0;
        const timer = setInterval(() => {
            p = Math.min(p + 5, 100);
            setProgress(p);

            // stage text 업데이트
            for (let i = stages.length - 1; i >= 0; i--) {
                if (p >= stages[i].threshold) {
                    setStageText(stages[i].text);
                    break;
                }
            }

            if (p >= 100) {
                clearInterval(timer);
                // 원본: 3.2초 후 이동 느낌 유지 (조금 텀)
                setTimeout(() => {
                    setLoadingOpen(false);
                    navigate("/gallery");
                }, 200);
            }
        }, 120);

        return () => clearInterval(timer);
    }, [loadingOpen, navigate, stages]);

    // 파일탭 클릭 시: 탭 변경 + 파일 선택창 자동 오픈(원본과 동일 UX)
    const onClickFileTab = () => {
        setTab("file");
        setTimeout(() => dropzoneRef.current?.openPicker?.(), 0);
    };

    // URL탭 클릭
    const onClickUrlTab = () => {
        setTab("url");
    };

    return (
        <div id="main">
            <div className="wrap">
                <div className="box" id="homeUI">
                    {/* LEFT */}
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
                                딥러닝 기술로 영상의 위변조 여부를 분석하고, <br /> 의심 구간과 근거를 명확하게 제시합니다.
                            </p>
                        </div>

                        {/* LoadingOverlay 컴포넌트 */}
                        <LoadingOverlay
                            open={loadingOpen}
                            fileLabel={loadingFileLabel}
                            previewSrc={previewSrc}
                            stageText={stageText}
                            progress={progress}
                        />
                    </div>

                    {/* RIGHT */}
                    <div className="right">
                        {/* Tabs + Analyze Button */}
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

                        {/* Content */}
                        <div className="tab-box" id="analyzeUI">
                            {/* FILE TAB */}
                            {tab === "file" && (
                                <DropzoneUpload
                                    ref={dropzoneRef}
                                    onChange={(file, src) => {
                                        setSelectedFile(file);
                                        setPreviewSrc(src);
                                    }}
                                />
                            )}

                            {/* URL TAB */}
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
                                                onChange={(e) => setUrlValue(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="url-clear"
                                                aria-label="clear"
                                                onClick={() => setUrlValue("")}
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <p className="url-hint">예: https://www.youtube.com/watch?v=...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Content End */}
                    </div>
                </div>
            </div>
        </div>
    );
}
