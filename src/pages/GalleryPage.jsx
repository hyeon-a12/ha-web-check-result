import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { fetchGalleryMockDetails } from "../services/api";

export default function GalleryPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [analysis] = useState(location.state?.analysis || null);
    const [details, setDetails] = useState([]);
    const [previewSrc] = useState(location.state?.previewSrc || location.state?.analysis?.thumbnail || "");

    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const aiScore = Math.round(analysis?.confidenceScore ?? 87);
    const trustScore = 94;
    const isAiGenerated = aiScore >= 50;

    const frameData = useMemo(
        () => ({
            frames: [
                { time: "0:00", score: 12 },
                { time: "0:05", score: 18 },
                { time: "0:10", score: 22 },
                { time: "0:15", score: 45 },
                { time: "0:20", score: 67 },
                { time: "0:25", score: 82 },
                { time: "0:30", score: 91 },
                { time: "0:35", score: 88 },
                { time: "0:40", score: 75 },
                { time: "0:45", score: 60 },
                { time: "0:50", score: 43 },
                { time: "0:55", score: 55 },
                { time: "1:00", score: 72 },
                { time: "1:05", score: 85 },
                { time: "1:10", score: 94 },
                { time: "1:15", score: 78 },
                { time: "1:20", score: 52 },
                { time: "1:25", score: 38 },
                { time: "1:30", score: 20 },
                { time: "1:35", score: 15 },
                { time: "1:40", score: 30 },
                { time: "1:45", score: 58 },
                { time: "1:50", score: 76 },
                { time: "1:55", score: 89 },
                { time: "2:00", score: 95 },
                { time: "2:05", score: 87 },
                { time: "2:10", score: 63 },
                { time: "2:15", score: 41 },
                { time: "2:20", score: 25 },
                { time: "2:25", score: 10 },
                { time: "2:30", score: 14 },
                { time: "2:34", score: 8 },
            ],
        }),
        []
    );

    const frameStats = useMemo(() => {
        const scores = frameData.frames.map((frame) => frame.score);
        const peak = Math.max(...scores);

        return {
            avg: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
            peakTime: frameData.frames[scores.indexOf(peak)].time,
            dangerCount: scores.filter((score) => score >= 70).length,
        };
    }, [frameData]);

    useEffect(() => {
        let active = true;

        const loadMockDetails = async () => {
            try {
                const nextDetails = await fetchGalleryMockDetails();
                if (!active) return;
                setDetails(nextDetails);
            } catch (error) {
                if (!active) return;
                setDetails([]);
            }
        };

        loadMockDetails();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let script;

        const renderChart = () => {
            if (!chartRef.current || !window.Chart) return;

            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const context = chartRef.current.getContext("2d");
            const scores = frameData.frames.map((frame) => frame.score);
            const labels = frameData.frames.map((frame) => frame.time);
            const pointColors = scores.map((score) => {
                if (score >= 70) return "#E24B4A";
                if (score >= 50) return "#EF9F27";
                return "#378ADD";
            });

            const gradient = context.createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0, "rgba(55, 138, 221, 0.18)");
            gradient.addColorStop(1, "rgba(55, 138, 221, 0.01)");

            chartInstanceRef.current = new window.Chart(context, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            data: scores,
                            borderColor: "#378ADD",
                            borderWidth: 2,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: pointColors,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            tension: 0.35,
                            fill: true,
                            backgroundColor: gradient,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (tooltipItem) => ` 의심도: ${tooltipItem.parsed.y}%`,
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: {
                                font: { size: 11 },
                                color: "#888",
                                maxRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: 10,
                            },
                            grid: { display: false },
                        },
                        y: {
                            min: 0,
                            max: 100,
                            ticks: {
                                font: { size: 11 },
                                color: "#888",
                                callback: (value) => `${value}%`,
                            },
                            grid: { color: "rgba(136, 136, 136, 0.12)" },
                        },
                    },
                },
            });
        };

        if (window.Chart) {
            renderChart();
        } else {
            script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
            script.async = true;
            script.onload = renderChart;
            document.body.appendChild(script);
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }

            if (script?.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [frameData]);

    const scoreLabel = useMemo(() => {
        if (aiScore >= 80) return "매우 높음";
        if (aiScore >= 60) return "높음";
        if (aiScore >= 40) return "중간";
        return "낮음";
    }, [aiScore]);

    const videoTitle = location.state?.displayTitle || analysis?.title || "의심스러운 인물 영상";
    const visibleDetails = details.slice(0, 4);

    return (
        <div id="main">
            <div className="wrap">
                <section id="resultPage" className="result-page">
                    <div className="result-top">
                        <div className="rt-left">
                            <h2 className="rt-title">분석 결과 리포트</h2>
                            <p className="rt-sub">업로드한 영상의 위변조와 AI 생성 의심 구간을 종합 분석했습니다.</p>
                        </div>

                        <div className="rt-right">
                            <button
                                type="button"
                                className="ghost-pill"
                                id="backToHomeBtn"
                                onClick={() => navigate("/")}
                            >
                                메인으로 돌아가기
                            </button>
                        </div>
                    </div>

                    <div className="result-grid">
                        <div className="card video-card">
                            <div className="card-head">
                                <h3>{videoTitle}</h3>
                                <span className="badge warn">주의 필요</span>
                            </div>

                            <div className="video-preview">
                                {previewSrc ? (
                                    <img className="gallery-preview-image" alt="업로드한 미리보기" src={previewSrc} />
                                ) : (
                                    <div className="vp-dummy">영상 미리보기</div>
                                )}
                            </div>

                            <div className={`verdict-banner ${isAiGenerated ? "danger" : "safe"}`}>
                                <div className="verdict-icon">{isAiGenerated ? "AI" : "OK"}</div>
                                <div className="verdict-text">
                                    <div className="verdict-title">
                                        {isAiGenerated ? "이건 AI 생성물 입니다." : "이건 AI 생성물이 아닙니다."}
                                    </div>
                                    <div className="verdict-desc">
                                        {isAiGenerated
                                            ? `AI 생성·조작 가능성 ${aiScore}%가 감지되었습니다.`
                                            : `AI 생성·조작 가능성 ${aiScore}%로 비교적 낮게 감지되었습니다.`}
                                    </div>
                                </div>
                                <div className="verdict-pill">{aiScore}%</div>
                            </div>

                            <div className="score-row">
                                <div>
                                    <div className="score-label">AI 생성 가능성</div>
                                    <div className="score-bar">
                                        <div className="score-fill" style={{ width: `${aiScore}%` }} />
                                    </div>
                                    <div className="score-desc">AI 생성/조작 가능성이 높게 감지되었습니다.</div>
                                </div>
                                <div className="score-num">
                                    <div className="big">{aiScore}%</div>
                                    <div className="small">{scoreLabel}</div>
                                </div>
                            </div>
                        </div>

                        <div className="side-col">
                            <div className="card">
                                <h4 className="mini-title">분석 신뢰도</h4>
                                <div className="trust">
                                    <div className="trust-num">{trustScore}%</div>
                                    <div className="trust-sub">이 분석 결과의 신뢰도</div>
                                </div>
                            </div>

                            <div className="card">
                                <h4 className="mini-title">분석 정보</h4>
                                <ul className="info-list">
                                    <li>
                                        <span>분석 시간</span>
                                        <b>14.2초</b>
                                    </li>
                                    <li>
                                        <span>영상 길이</span>
                                        <b>{analysis?.duration || "2분 34초"}</b>
                                    </li>
                                    <li>
                                        <span>해상도</span>
                                        <b>1920×1080</b>
                                    </li>
                                    <li>
                                        <span>프레임 레이트</span>
                                        <b>30fps</b>
                                    </li>
                                    <li>
                                        <span>파일 크기</span>
                                        <b>245MB</b>
                                    </li>
                                </ul>
                            </div>

                            <div className="card">
                                <h4 className="mini-title">사용된 모델</h4>
                                <div className="chips">
                                    <span className="chip">Vision Transformer</span>
                                    <span className="chip">ResNet-50</span>
                                    <span className="chip">XceptionNet</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card section-card">
                        <h3 className="section-title">프레임별 위조 의심도 타임라인</h3>
                        <div className="timeline-dummy">
                            <div className="bar red" style={{ width: "22%" }} />
                            <div className="bar blue" style={{ width: "18%" }} />
                            <div className="bar red" style={{ width: "30%" }} />
                            <div className="bar blue" style={{ width: "15%" }} />
                            <div className="bar red" style={{ width: "15%" }} />
                        </div>
                        <p className="hint">빨강: 높음(70%+) · 노랑: 중간(50~69%) · 파랑: 낮음(50% 미만)</p>
                    </div>

                    <div className="card section-card timeline-card">
                        <div className="timeline-header">
                            <div>
                                <h3 className="section-title">프레임별 위조 의심도 그래프</h3>
                                <p className="hint">총 {frameData.frames.length}개 프레임 · 30fps</p>
                            </div>
                            <div className="timeline-legend">
                                <span><em style={{ background: "#E24B4A" }} />높음 (70%+)</span>
                                <span><em style={{ background: "#EF9F27" }} />중간 (50-69%)</span>
                                <span><em style={{ background: "#378ADD" }} />낮음 (50% 미만)</span>
                            </div>
                        </div>

                        <div className="timeline-chart">
                            <canvas ref={chartRef} />
                        </div>

                        <div className="timeline-stats">
                            <div className="tstat-box">
                                <p className="tstat-label">평균 의심도</p>
                                <p className="tstat-value">{frameStats.avg}%</p>
                            </div>
                            <div className="tstat-box">
                                <p className="tstat-label">최고 의심 구간</p>
                                <p className="tstat-value danger">{frameStats.peakTime}</p>
                            </div>
                            <div className="tstat-box">
                                <p className="tstat-label">위험 구간 수</p>
                                <p className="tstat-value danger">{frameStats.dangerCount}구간</p>
                            </div>
                        </div>
                    </div>

                    <div className="card section-card">
                        <h3 className="section-title">상세 분석 결과</h3>

                        {visibleDetails.map((detail) => (
                            <div className="detail-item" key={detail.key}>
                                <div className="d-left">
                                    <div className="d-title">
                                        {detail.title} <span className={`tag ${detail.tag.className}`}>{detail.tag.label}</span>
                                    </div>
                                    <div className="d-desc">{detail.description}</div>
                                </div>
                                <div className="d-right">
                                    <div className="d-percent">{Math.round(detail.score)}%</div>
                                    <div className="d-sub">신뢰도</div>
                                </div>
                                <div
                                    className={`d-bar ${detail.tag.className === "mid" ? "mid" : detail.tag.className === "low" ? "low" : ""}`}
                                >
                                    <span style={{ width: `${Math.round(detail.score)}%` }} />
                                </div>
                            </div>
                        ))}

                        <div className="detail-item">
                            <div className="d-left">
                                <div className="d-title">
                                    텍스처 분석 <span className="tag low">위험도: 낮음</span>
                                </div>
                                <div className="d-desc">피부 질감 생성 패턴의 미세한 규칙성 감지</div>
                            </div>
                            <div className="d-right">
                                <div className="d-percent">61%</div>
                                <div className="d-sub">신뢰도</div>
                            </div>
                            <div className="d-bar low">
                                <span style={{ width: "61%" }} />
                            </div>
                        </div>
                    </div>

                    <div className="pdf-area">
                        <a className="pdf-btn" href="/report.pdf" download>
                            분석 리포트 PDF 다운로드
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}
