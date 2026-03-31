import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─────────────────────────────────────────────────────────────
// 임시 JSON 데이터 (실제 서비스에서는 API 응답으로 교체)
// ─────────────────────────────────────────────────────────────
const MOCK_ANALYSIS = {
    analysis_id: "H200_20260312170203",
    filename: "test_0006_(북한 실제영상) 평양의 아침 8시30분 풍경은 어떨까？.mp4",
    final_prediction: "REAL",
    overall_confidence_percent: 85.82,
    timeline_chart: [
        { frame_idx: 1, fake_prob: 57.16, risk: "중간", color: "yellow" },
        { frame_idx: 2, fake_prob: 64.24, risk: "중간", color: "yellow" },
        { frame_idx: 3, fake_prob: 50.4, risk: "중간", color: "yellow" },
        { frame_idx: 4, fake_prob: 53.07, risk: "중간", color: "yellow" },
        { frame_idx: 5, fake_prob: 66.79, risk: "중간", color: "yellow" },
        { frame_idx: 6, fake_prob: 55.19, risk: "중간", color: "yellow" },
        { frame_idx: 7, fake_prob: 41.95, risk: "낮음", color: "blue" },
        { frame_idx: 8, fake_prob: 18.14, risk: "낮음", color: "blue" },
        { frame_idx: 9, fake_prob: 7.09, risk: "낮음", color: "blue" },
        { frame_idx: 10, fake_prob: 5.78, risk: "낮음", color: "blue" },
        { frame_idx: 11, fake_prob: 2.43, risk: "낮음", color: "blue" },
        { frame_idx: 12, fake_prob: 3.12, risk: "낮음", color: "blue" },
        { frame_idx: 13, fake_prob: 4.5, risk: "낮음", color: "blue" },
        { frame_idx: 14, fake_prob: 6.78, risk: "낮음", color: "blue" },
        { frame_idx: 15, fake_prob: 9.21, risk: "낮음", color: "blue" },
        { frame_idx: 16, fake_prob: 13.89, risk: "낮음", color: "blue" },
    ],
    heatmap_frames: [
        { id: "VSLN-1", fake_prob: 99.95, real_prob: 0.05, image: null },
        { id: "VSLN-3", fake_prob: 98.95, real_prob: 1.05, image: null },
        { id: "VSLN-5", fake_prob: 96.91, real_prob: 3.09, image: null },
        { id: "VSLN-7", fake_prob: 77.51, real_prob: 22.49, image: null },
    ],
    detailed_analysis: [
        {
            title: "프레임 전환 일관성 위험도",
            risk_level: "낮음",
            score_percent: 40.7,
            description: "프레임 전환 시 얼굴이나 배경의 미세한 떨림 및 시공간적 비일관성이 40.7% 수준으로 감지되었습니다.",
        },
        {
            title: "공간적 텍스처 및 화질 왜곡 위험도",
            risk_level: "낮음",
            score_percent: 28.7,
            description: "이미지 생성 과정에서 발생하는 인위적인 픽셀 뭉개짐이나 텍스처 이상 징후가 28.7% 확률로 감지되었습니다.",
        },
        {
            title: "얼굴 경계 왜곡 위험도",
            risk_level: "중간",
            score_percent: 74.0,
            description: "헤어라인/윤곽부 픽셀 불연속성 다수 발견되었습니다.",
            proOnly: true,
        },
        {
            title: "조명 일관성 위험도",
            risk_level: "중간",
            score_percent: 68.0,
            description: "얼굴 좌우 조명 방향 불일치(3.2s ~ 4.1s) 구간이 감지되었습니다.",
            proOnly: true,
        },
        {
            title: "텍스처 분석 위험도",
            risk_level: "낮음",
            score_percent: 61.0,
            description: "피부 질감 생성 패턴의 미세한 규칙성이 감지되었습니다.",
            proOnly: true,
        },
    ],
};

// ─────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────
function riskTag(level) {
    if (level === "높음") return "high";
    if (level === "중간") return "mid";
    return "low";
}

function pointColorFromProb(prob) {
    if (prob >= 70) return "#E24B4A";
    if (prob >= 50) return "#EF9F27";
    return "#378ADD";
}

function normalizeBaseUrl(base) {
    if (!base) return "";
    return base.endsWith("/") ? base.slice(0, -1) : base;
}

function buildAnalyzeAssetUrlCandidates(path) {
    if (!path) return [];
    if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
        return [path];
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const candidates = [];
    const analyzeBaseUrl = normalizeBaseUrl(process.env.REACT_APP_ANALYZE_API_BASE_URL);
    const apiBaseUrl = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
    const currentOrigin =
        typeof window !== "undefined" && window.location?.origin
            ? normalizeBaseUrl(window.location.origin)
            : "";

    if (analyzeBaseUrl) candidates.push(`${analyzeBaseUrl}${normalizedPath}`);
    if (apiBaseUrl && apiBaseUrl !== analyzeBaseUrl) candidates.push(`${apiBaseUrl}${normalizedPath}`);
    if (currentOrigin && currentOrigin !== analyzeBaseUrl && currentOrigin !== apiBaseUrl) {
        candidates.push(`${currentOrigin}${normalizedPath}`);
    }
    candidates.push(normalizedPath);

    return [...new Set(candidates)];
}

function HeatmapImage({ path, alt, className }) {
    const candidates = useMemo(() => buildAnalyzeAssetUrlCandidates(path), [path]);
    const [candidateIndex, setCandidateIndex] = useState(0);

    useEffect(() => {
        setCandidateIndex(0);
    }, [path]);

    if (!candidates.length) {
        return null;
    }

    return (
        <img
            className={className}
            src={candidates[candidateIndex]}
            alt={alt}
            onError={() => {
                setCandidateIndex((current) => {
                    if (current >= candidates.length - 1) return current;
                    return current + 1;
                });
            }}
        />
    );
}

function resolveAnalyzeAssetUrl(path) {
    const [firstCandidate] = buildAnalyzeAssetUrlCandidates(path);
    return firstCandidate || null;
}

function getClosestHeatmapFrame(frameIdx, heatmapFrames) {
    if (!Number.isFinite(frameIdx) || !Array.isArray(heatmapFrames) || heatmapFrames.length === 0) {
        return null;
    }

    return heatmapFrames.reduce((closest, frame) => {
        const candidateIdx = Number(frame.frame_index);
        if (!Number.isFinite(candidateIdx)) return closest;
        if (!closest) return frame;

        const currentGap = Math.abs(candidateIdx - frameIdx);
        const closestGap = Math.abs(Number(closest.frame_index) - frameIdx);
        return currentGap < closestGap ? frame : closest;
    }, null);
}

function getOrCreateChartTooltip(chart) {
    const parent = chart.canvas.parentNode;
    if (!parent) return null;

    let tooltipEl = parent.querySelector(".chart-heatmap-tooltip");
    if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.className = "chart-heatmap-tooltip";
        tooltipEl.style.position = "absolute";
        tooltipEl.style.pointerEvents = "none";
        tooltipEl.style.transform = "translate(-50%, calc(-100% - 12px))";
        tooltipEl.style.background = "rgba(17, 24, 39, 0.96)";
        tooltipEl.style.border = "1px solid rgba(255, 255, 255, 0.12)";
        tooltipEl.style.borderRadius = "12px";
        tooltipEl.style.padding = "10px";
        tooltipEl.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.28)";
        tooltipEl.style.color = "#f9fafb";
        tooltipEl.style.opacity = "0";
        tooltipEl.style.transition = "opacity .12s ease";
        tooltipEl.style.zIndex = "20";
        tooltipEl.style.minWidth = "150px";
        parent.style.position = "relative";
        parent.appendChild(tooltipEl);
    }

    return tooltipEl;
}

function buildHeatmapTooltipHandler(heatmapFrames) {
    return ({ chart, tooltip }) => {
        const tooltipEl = getOrCreateChartTooltip(chart);
        if (!tooltipEl) return;

        if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
            tooltipEl.style.opacity = "0";
            return;
        }

        const point = tooltip.dataPoints[0];
        const frame = point?.raw && typeof point.raw === "object"
            ? point.raw
            : point?.dataIndex != null
                ? chart.data.datasets[0]?.data?.[point.dataIndex]
                : null;
        const frameIdx = Number(frame?.frame_idx);
        const fakeProb = Number(frame?.fake_prob ?? point?.parsed?.y ?? 0);
        const matchedHeatmap = getClosestHeatmapFrame(frameIdx, heatmapFrames);
        const imageMarkup = matchedHeatmap?.image
            ? `<img src="${matchedHeatmap.image}" alt="Frame ${frameIdx} heatmap" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:8px;background:#111827;" />`
            : `<div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#1f2937;color:#9ca3af;font-size:10px;font-weight:700;">No image</div>`;

        tooltipEl.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:10px;">
                ${imageMarkup}
                <div style="min-width:0;">
                    <div style="font-size:12px;font-weight:800;line-height:1.2;">Frame ${frameIdx}</div>
                    <div style="font-size:11px;color:#d1d5db;line-height:1.45;margin-top:4px;">위조 의심도 ${fakeProb.toFixed(2)}%</div>
                    <div style="font-size:10px;color:#9ca3af;line-height:1.4;margin-top:4px;">
                        ${matchedHeatmap?.frame_index ? `히트맵 기준 Frame ${matchedHeatmap.frame_index}` : "히트맵 이미지 없음"}
                    </div>
                </div>
            </div>
        `;

        const { offsetLeft, offsetTop } = chart.canvas;
        tooltipEl.style.left = `${offsetLeft + tooltip.caretX}px`;
        tooltipEl.style.top = `${offsetTop + tooltip.caretY}px`;
        tooltipEl.style.opacity = "1";
    };
}

// PDF 전용 보고서 컴포넌트
// ─────────────────────────────────────────────────────────────
function PdfLineChart({ data }) {
    const width = 680;
    const height = 180;
    const padding = 28;

    const maxX = data.length - 1 || 1;
    const maxY = 100;

    const points = data.map((item, idx) => {
        const x = padding + (idx / maxX) * (width - padding * 2);
        const y =
            height - padding - (item.fake_prob / maxY) * (height - padding * 2);
        return `${x},${y}`;
    });

    const polylinePoints = points.join(" ");

    return (
        <div
            style={{
                border: "1px solid #d7dbe1",
                background: "#fafafa",
                padding: 12,
                borderRadius: 10,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#374151",
                    marginBottom: 8,
                }}
            >
                프레임별 위조 확률 추이
            </div>

            <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
                {[0, 25, 50, 75, 100].map((tick) => {
                    const y =
                        height - padding - (tick / maxY) * (height - padding * 2);
                    return (
                        <g key={tick}>
                            <line
                                x1={padding}
                                y1={y}
                                x2={width - padding}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeWidth="1"
                            />
                            <text x={6} y={y + 4} fontSize="10" fill="#9ca3af">
                                {tick}
                            </text>
                        </g>
                    );
                })}

                <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    points={polylinePoints}
                />

                {data.map((item, idx) => {
                    const x = padding + (idx / maxX) * (width - padding * 2);
                    const y =
                        height - padding - (item.fake_prob / maxY) * (height - padding * 2);

                    return (
                        <circle
                            key={`${item.frame_idx}-${idx}`}
                            cx={x}
                            cy={y}
                            r="3"
                            fill={
                                item.fake_prob >= 70
                                    ? "#dc2626"
                                    : item.fake_prob >= 50
                                        ? "#f59e0b"
                                        : "#2563eb"
                            }
                        />
                    );
                })}
            </svg>
        </div>
    );
}
function PrintableReport({
    analysisData,
    inlineFrameStats,
    publicItems,
    reportDate,
}) {
    const verdictText =
        analysisData.final_prediction === "FAKE" ? "AI 생성 의심" : "정상 영상";

    const verdictColor =
        analysisData.final_prediction === "FAKE" ? "#d9485f" : "#2f7d4a";

    const fileExt =
        analysisData.filename?.split(".").pop()?.toLowerCase() || "unknown";

    const modelNames = analysisData.model_names ?? [
        "Vision Transformer",
        "ResNet-50",
        "XceptionNet",
    ];

    const sortedTop4FrameIdx = [...analysisData.timeline_chart]
        .sort((a, b) => b.fake_prob - a.fake_prob)
        .slice(0, 4)
        .map((item) => item.frame_idx);

    const compactSummary = `
본 영상은 ${verdictText}으로 판정되었으며, 전체 판별 신뢰도는 ${analysisData.overall_confidence_percent.toFixed(1)}%입니다.
최고 의심 프레임은 Frame ${inlineFrameStats.peakIdx}, 위험 구간은 총 ${inlineFrameStats.dangerCount}개입니다.
상위 의심 프레임 전후 구간을 중심으로 얼굴 경계, 배경 이음새, 질감 불연속성, 조명 일관성을 추가 확인하는 것이 좋습니다.
    `.trim();

    return (
        <div
            style={{
                width: 794,
                background: "#f4f5f7",
                padding: 24,
                boxSizing: "border-box",
                fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif",
            }}
        >
            <style>{`
                .pdf-page {
                    width: 744px;
                    min-height: 1046px;
                    background: #fff;
                    margin: 0 auto 24px;
                    padding: 28px 30px 24px;
                    box-sizing: border-box;
                    border: 1px solid #d9dde3;
                    page-break-after: always;
                }
                .pdf-page:last-child {
                    page-break-after: auto;
                }

                .pdf-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                    border-bottom: 2px solid #1f2937;
                    padding-bottom: 14px;
                    margin-bottom: 18px;
                }
                .pdf-title {
                    font-size: 24px;
                    font-weight: 800;
                    color: #111827;
                    margin: 0;
                }
                .pdf-subtitle {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 4px;
                }
                .pdf-badge {
                    min-width: 112px;
                    text-align: center;
                    border: 1px solid #d1d5db;
                    padding: 10px 14px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #374151;
                    background: #f9fafb;
                }

                .pdf-format-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 10px;
                    padding: 6px 12px;
                    border-radius: 999px;
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    color: #1d4ed8;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .pdf-info-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 18px;
                    font-size: 12px;
                }
                .pdf-info-table th,
                .pdf-info-table td {
                    border: 1px solid #d7dbe1;
                    padding: 8px 10px;
                    text-align: left;
                    vertical-align: middle;
                }
                .pdf-info-table th {
                    width: 110px;
                    background: #f3f4f6;
                    color: #374151;
                    font-weight: 700;
                }

                .pdf-model-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .pdf-model-chip {
                    display: inline-flex;
                    padding: 5px 10px;
                    border-radius: 999px;
                    background: #eef2ff;
                    border: 1px solid #c7d2fe;
                    color: #3730a3;
                    font-size: 11px;
                    font-weight: 700;
                }

                .pdf-section {
                    margin-bottom: 18px;
                }
                .pdf-section-title {
                    font-size: 14px;
                    font-weight: 800;
                    color: #111827;
                    padding-left: 10px;
                    border-left: 4px solid #2563eb;
                    margin: 0 0 10px;
                }

                .pdf-verdict-box {
                    border: 1px solid #d7dbe1;
                    background: #fafafa;
                    padding: 14px 16px;
                    border-radius: 10px;
                }
                .pdf-verdict-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                .pdf-verdict-label {
                    font-size: 13px;
                    color: #6b7280;
                    font-weight: 700;
                }
                .pdf-verdict-value {
                    font-size: 20px;
                    font-weight: 800;
                }
                .pdf-verdict-desc {
                    font-size: 12px;
                    line-height: 1.7;
                    color: #374151;
                }

                .pdf-metric-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 14px;
                }
                .pdf-metric-card {
                    border: 1px solid #d7dbe1;
                    background: #fafafa;
                    padding: 14px 12px;
                    text-align: center;
                    border-radius: 10px;
                }
                .pdf-metric-label {
                    font-size: 11px;
                    color: #6b7280;
                    margin-bottom: 6px;
                }
                .pdf-metric-value {
                    font-size: 18px;
                    font-weight: 800;
                    color: #111827;
                }

                .pdf-frame-list {
                    margin-top: 12px;
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                .pdf-frame-item {
                    border: 1px solid #d7dbe1;
                    border-radius: 10px;
                    padding: 10px 12px;
                    background: #fafafa;
                }
                .pdf-frame-item.top {
                    background: #fff7ed;
                    border-color: #fdba74;
                }
                .pdf-frame-top-badge {
                    display: inline-block;
                    margin-left: 8px;
                    padding: 3px 7px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                    background: #f97316;
                    color: white;
                }
                .pdf-frame-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                }
                .pdf-frame-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #111827;
                }
                .pdf-frame-sub {
                    font-size: 11px;
                    color: #6b7280;
                    margin-top: 4px;
                }
                .pdf-frame-prob {
                    font-size: 15px;
                    font-weight: 800;
                    color: #111827;
                }

                .pdf-analysis-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-bottom: 12px;
                }
                .pdf-analysis-table th,
                .pdf-analysis-table td {
                    border: 1px solid #d7dbe1;
                    padding: 9px 10px;
                    text-align: left;
                    vertical-align: top;
                }
                .pdf-analysis-table th {
                    background: #f3f4f6;
                    font-weight: 700;
                    color: #374151;
                }

                .pdf-summary-box {
                    border: 1px solid #d7dbe1;
                    background: #fafafa;
                    padding: 14px 16px;
                    font-size: 12px;
                    line-height: 1.8;
                    color: #374151;
                    white-space: pre-line;
                    margin-bottom: 16px;
                    border-radius: 10px;
                }

                .pdf-heatmap-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .pdf-heatmap-card {
                    border: 1px solid #d7dbe1;
                    background: #fff;
                    overflow: hidden;
                    border-radius: 8px;
                }
                .pdf-heatmap-image {
                    width: 100%;
                    height: 170px;
                    object-fit: cover;
                    display: block;
                    background: #e5e7eb;
                }
                .pdf-heatmap-empty {
                    width: 100%;
                    height: 170px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f3f4f6;
                    color: #9ca3af;
                    font-size: 12px;
                    font-weight: 700;
                }
                .pdf-heatmap-meta {
                    padding: 8px 10px;
                    font-size: 11px;
                    line-height: 1.7;
                }

                .pdf-footer {
                    margin-top: 18px;
                    padding-top: 10px;
                    border-top: 1px solid #e5e7eb;
                    text-align: right;
                    font-size: 11px;
                    color: #9ca3af;
                }
            `}</style>

            <div className="pdf-page">
                <div className="pdf-header">
                    <div>
                        <h1 className="pdf-title">분석 결과 보고서</h1>
                        <div className="pdf-subtitle">영상 위·변조 / AI 생성 의심 분석 결과</div>
                        <div className="pdf-format-badge">
                            파일 형식
                            <span>.{fileExt}</span>
                        </div>
                    </div>
                    <div className="pdf-badge">자동 생성 보고서</div>
                </div>

                <table className="pdf-info-table">
                    <tbody>
                        <tr>
                            <th>분석 ID</th>
                            <td>{analysisData.analysis_id}</td>
                            <th>분석 일시</th>
                            <td>{reportDate}</td>
                        </tr>
                        <tr>
                            <th>파일명</th>
                            <td colSpan={3}>{analysisData.filename}</td>
                        </tr>
                        <tr>
                            <th>파일 크기</th>
                            <td>{analysisData.file_size ?? "245MB"}</td>
                            <th>영상 길이</th>
                            <td>{analysisData.video_duration ?? "2분 34초"}</td>
                        </tr>
                        <tr>
                            <th>해상도</th>
                            <td>{analysisData.resolution ?? "1920×1080"}</td>
                            <th>프레임 레이트</th>
                            <td>{analysisData.frame_rate ?? "30fps"}</td>
                        </tr>
                        <tr>
                            <th>판별 모델</th>
                            <td colSpan={3}>
                                <div className="pdf-model-chips">
                                    {modelNames.map((name) => (
                                        <span className="pdf-model-chip" key={name}>
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="pdf-section">
                    <h2 className="pdf-section-title">1. 최종 판정</h2>
                    <div className="pdf-verdict-box">
                        <div className="pdf-verdict-row">
                            <span className="pdf-verdict-label">판정 결과</span>
                            <span className="pdf-verdict-value" style={{ color: verdictColor }}>
                                {verdictText}
                            </span>
                        </div>
                        <div className="pdf-verdict-desc">
                            전체 판별 신뢰도는 <b>{analysisData.overall_confidence_percent.toFixed(1)}%</b>이며,
                            프레임별 분석 결과를 종합해 최종 판정을 산출했습니다.
                        </div>
                    </div>
                </div>

                <div className="pdf-section">
                    <h2 className="pdf-section-title">2. 핵심 판별 지표 및 프레임별 위조 확률 추이</h2>

                    <div className="pdf-metric-grid">
                        <div className="pdf-metric-card">
                            <div className="pdf-metric-label">최종 판정</div>
                            <div className="pdf-metric-value">{verdictText}</div>
                        </div>
                        <div className="pdf-metric-card">
                            <div className="pdf-metric-label">판별 신뢰도</div>
                            <div className="pdf-metric-value">
                                {analysisData.overall_confidence_percent.toFixed(1)}%
                            </div>
                        </div>
                        <div className="pdf-metric-card">
                            <div className="pdf-metric-label">최고 의심 프레임</div>
                            <div className="pdf-metric-value">Frame {inlineFrameStats.peakIdx}</div>
                        </div>
                        <div className="pdf-metric-card">
                            <div className="pdf-metric-label">위험 구간 수</div>
                            <div className="pdf-metric-value">{inlineFrameStats.dangerCount}개</div>
                        </div>
                    </div>

                    <PdfLineChart data={analysisData.timeline_chart} />

                    <div className="pdf-frame-list">
                        {analysisData.timeline_chart.map((frame) => {
                            const isTop = sortedTop4FrameIdx.includes(frame.frame_idx);

                            return (
                                <div
                                    key={`frame-list-${frame.frame_idx}`}
                                    className={`pdf-frame-item${isTop ? " top" : ""}`}
                                >
                                    <div className="pdf-frame-row">
                                        <div className="pdf-frame-title">
                                            Frame {frame.frame_idx}
                                            {isTop && <span className="pdf-frame-top-badge">상위 의심</span>}
                                        </div>
                                        <div className="pdf-frame-prob">
                                            {frame.fake_prob.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="pdf-frame-sub">
                                        실제 프레임 번호: {frame.frame_idx} / 위험도: {frame.risk}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="pdf-footer">
                    생성일시: {reportDate} · 분석 ID: {analysisData.analysis_id}
                </div>
            </div>

            <div className="pdf-page">
                <div className="pdf-header">
                    <div>
                        <h1 className="pdf-title">분석 결과 보고서</h1>
                        <div className="pdf-subtitle">상세 분석 및 히트맵 결과</div>
                    </div>
                    <div className="pdf-badge">2 Page</div>
                </div>

                <div className="pdf-section">
                    <h2 className="pdf-section-title">3. 주요 분석 항목</h2>
                    <table className="pdf-analysis-table">
                        <thead>
                            <tr>
                                <th style={{ width: "30%" }}>항목</th>
                                <th style={{ width: "14%" }}>위험도</th>
                                <th style={{ width: "14%" }}>점수</th>
                                <th>설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {publicItems.map((item, idx) => (
                                <tr key={`${item.title}-${idx}`}>
                                    <td>{item.title}</td>
                                    <td>{item.risk_level}</td>
                                    <td>{item.score_percent}%</td>
                                    <td>{item.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="pdf-section">
                    <h2 className="pdf-section-title">4. 종합 의견</h2>
                    <div className="pdf-summary-box">{compactSummary}</div>
                </div>

                <div className="pdf-section" style={{ marginTop: "auto" }}>
                    <h2 className="pdf-section-title">5. 히트맵 이미지</h2>
                    <div className="pdf-heatmap-grid">
                        {analysisData.heatmap_frames.slice(0, 4).map((frame, idx) => (
                            <div className="pdf-heatmap-card" key={`${frame.id}-${idx}`}>
                                {frame.image ? (
                                    <img
                                        src={frame.image}
                                        alt={`heatmap-${frame.id}`}
                                        className="pdf-heatmap-image"
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div className="pdf-heatmap-empty">히트맵 이미지 없음</div>
                                )}
                                <div className="pdf-heatmap-meta">
                                    <div><b>{frame.id}</b></div>
                                    <div>AI 생성 의심: {frame.fake_prob.toFixed(2)}%</div>
                                    <div>실제 영상 확률: {frame.real_prob.toFixed(2)}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pdf-footer">
                    생성일시: {reportDate} · 분석 ID: {analysisData.analysis_id}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// FrameGraphPage — 기존 화면 유지
// ─────────────────────────────────────────────────────────────
function FrameGraphPage({ onBack, analysisData }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const { timeline_chart } = analysisData;

    const frameStats = useMemo(() => {
        const probs = timeline_chart.map((f) => f.fake_prob);
        const avg = Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 10) / 10;
        const peak = Math.max(...probs);
        const peakIdx = probs.indexOf(peak) + 1;
        const dangerCount = probs.filter((p) => p >= 70).length;
        return { avg, peak, peakIdx, dangerCount };
    }, [timeline_chart]);

    useEffect(() => {
        const init = () => {
            if (!chartRef.current || !window.Chart) return;
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = chartRef.current.getContext("2d");
            const scores = timeline_chart.map((f) => f.fake_prob);
            const labels = timeline_chart.map((f) => `Frame ${f.frame_idx}`);
            const pointColors = scores.map(pointColorFromProb);
            const gradient = ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, "rgba(55,138,221,0.20)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");
            chartInstance.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            data: scores,
                            borderColor: "#378ADD",
                            borderWidth: 2.5,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: pointColors,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            tension: 0.35,
                            fill: true,
                            backgroundColor: gradient,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    legacyPlugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => ` 위조 확률: ${c.parsed.y.toFixed(2)}%` } },
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 11 }, color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                            grid: { display: false },
                        },
                        y: {
                            min: 0,
                            max: 100,
                            ticks: { font: { size: 11 }, color: "#888", callback: (v) => `${v}%` },
                            grid: { color: "rgba(136,136,136,0.12)" },
                        },
                    },
                },
            });
        };
        if (window.Chart) {
            init();
        } else {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
            s.onload = init;
            document.body.appendChild(s);
        }
        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, [timeline_chart]);

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "inherit" }}>
            <style>{`
                .fg-header { background:#fff; border-bottom:1px solid #e5e7eb; padding:16px 32px; display:flex; align-items:center; gap:16px; position:sticky; top:0; z-index:10; }
                .fg-back-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; border:1.5px solid #e5e7eb; border-radius:8px; background:#fff; font-size:13px; color:#374151; cursor:pointer; font-weight:500; transition:all .15s; }
                .fg-back-btn:hover { background:#f3f4f6; border-color:#d1d5db; }
                .fg-body { max-width:1100px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px; }
                .fg-card { background:#fff; border-radius:16px; border:1px solid #e5e7eb; padding:28px; box-shadow:0 1px 6px rgba(0,0,0,.05); }
                .fg-card-title { font-size:16px; font-weight:700; color:#111827; margin:0 0 6px; }
                .fg-legend { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
                .fg-legend span { display:flex; align-items:center; gap:6px; font-size:12px; color:#6b7280; }
                .fg-legend em { display:inline-block; width:10px; height:10px; border-radius:2px; font-style:normal; }
                .fg-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:20px; }
                .fg-stat-box { background:#f9fafb; border-radius:12px; padding:16px; text-align:center; }
                .fg-stat-label { font-size:11px; color:#9ca3af; margin:0 0 6px; }
                .fg-stat-value { font-size:22px; font-weight:700; color:#111827; margin:0; }
                .fg-stat-value.danger { color:#E24B4A; }
                .fg-heatmap-area { min-height:260px; background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; border:2px dashed #334155; }
                .fg-heatmap-icon { width:56px; height:56px; background:rgba(55,138,221,.12); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:26px; }
                .fg-heatmap-label { color:#94a3b8; font-size:13px; font-weight:500; }
                .fg-heatmap-sub { color:#475569; font-size:12px; margin-top:-4px; }
            `}</style>
            <div className="fg-header">
                <button className="fg-back-btn" onClick={onBack}>← 결과 리포트로 돌아가기</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>프레임별 위조 의심도 분석</div>
            </div>
            <div className="fg-body">
                <div className="fg-card">
                    <h3 className="fg-card-title">프레임별 위조 의심도 그래프</h3>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>총 {timeline_chart.length}개 프레임 분석</p>
                    <div className="fg-legend">
                        <span><em style={{ background: "#E24B4A" }} />높음 (70%+)</span>
                        <span><em style={{ background: "#EF9F27" }} />중간 (50–69%)</span>
                        <span><em style={{ background: "#378ADD" }} />낮음 (50% 미만)</span>
                    </div>
                    <div style={{ position: "relative", width: "100%", height: 280 }}>
                        <canvas ref={chartRef} />
                    </div>
                    <div className="fg-stats">
                        <div className="fg-stat-box">
                            <p className="fg-stat-label">평균 위조 확률</p>
                            <p className="fg-stat-value">{frameStats.avg}%</p>
                        </div>
                        <div className="fg-stat-box">
                            <p className="fg-stat-label">최고 의심 프레임</p>
                            <p className="fg-stat-value danger">Frame {frameStats.peakIdx}</p>
                        </div>
                        <div className="fg-stat-box">
                            <p className="fg-stat-label">위험 구간 수</p>
                            <p className="fg-stat-value danger">{frameStats.dangerCount}구간</p>
                        </div>
                    </div>
                </div>
                <div className="fg-card">
                    <h3 className="fg-card-title" style={{ marginBottom: 6 }}>히트맵 영상</h3>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>
                        위변조 의심 구간이 시각화된 히트맵 오버레이 영상입니다.
                    </p>
                    <div className="fg-heatmap-area">
                        <div className="fg-heatmap-icon">🎞️</div>
                        <div className="fg-heatmap-label">히트맵 영상 영역</div>
                        <div className="fg-heatmap-sub">분석 완료 후 히트맵 오버레이 영상이 표시됩니다.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main GalleryPage
// ─────────────────────────────────────────────────────────────
export default function GalleryPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const analysisData = useMemo(
        () => normalizeAnalysisData(location.state?.analysis, location.state?.previewSrc, location.state?.displayTitle),
        [location.state]
    );
    const isPro = false;

    const isAiGenerated = analysisData.final_prediction === "FAKE";
    const trustScore = analysisData.overall_confidence_percent.toFixed(1);

    const [showFrameGraph, setShowFrameGraph] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const menuRef = useRef(null);
    const reportRef = useRef(null);
    const inlineChartRef = useRef(null);
    const inlineChartInst = useRef(null);
    const reportCaptureRef = useRef(null);
    const previewSrc = location.state?.previewSrc || analysisData.thumbnail || "";
    const previewKind = location.state?.previewKind || "image";
    //유튜브 영상 재생하기 : HomePage에서 전달한 유튜브 videoId를 읽어 플레이어 렌더링 여부를 판단한다.
    const youtubeVideoId = location.state?.videoId || "";
    //유튜브 영상 재생하기 : videoId로 유튜브 embed 주소를 만들어 썸네일 대신 실제 플레이어를 표시한다.
    const youtubeEmbedUrl = youtubeVideoId
        ? `https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1&playsinline=1`
        : "";
    const videoTitle = location.state?.displayTitle?.trim() || analysisData.filename || "분석한 영상";

    const inlineFrameStats = useMemo(() => {
        const probs = analysisData.timeline_chart.map((f) => f.fake_prob);
        const avg = Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 10) / 10;
        const peak = Math.max(...probs);
        const peakIdx = probs.indexOf(peak) + 1;
        const dangerCount = probs.filter((p) => p >= 70).length;
        return { avg, peak, peakIdx, dangerCount };
    }, [analysisData.timeline_chart]);

    const reportDate = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }, []);

    useEffect(() => {
        const h = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    useEffect(() => {
        const chartContainer = inlineChartRef.current?.parentNode || null;
        const init = () => {
            if (!inlineChartRef.current || !window.Chart) return;
            if (inlineChartInst.current) inlineChartInst.current.destroy();
            const ctx = inlineChartRef.current.getContext("2d");
            const scores = analysisData.timeline_chart.map((f) => ({
                x: `Frame ${f.frame_idx}`,
                y: f.fake_prob,
                frame_idx: f.frame_idx,
                fake_prob: f.fake_prob,
            }));
            const labels = analysisData.timeline_chart.map((f) => `Frame ${f.frame_idx}`);
            const pointColors = analysisData.timeline_chart.map((f) => pointColorFromProb(f.fake_prob));
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, "rgba(55,138,221,0.20)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");
            inlineChartInst.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            data: scores,
                            borderColor: "#378ADD",
                            borderWidth: 2.5,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: pointColors,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            tension: 0.35,
                            fill: true,
                            backgroundColor: gradient,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: "nearest",
                        intersect: true,
                    },
                    legacyPlugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => ` 위조 확률: ${c.parsed.y.toFixed(2)}%` } },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: false,
                            external: buildHeatmapTooltipHandler(analysisData.heatmap_frames),
                        },
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 11 }, color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                            grid: { display: false },
                        },
                        y: {
                            min: 0,
                            max: 100,
                            ticks: { font: { size: 11 }, color: "#888", callback: (v) => `${v}%` },
                            grid: { color: "rgba(136,136,136,0.12)" },
                        },
                    },
                },
            });
        };
        if (window.Chart) {
            init();
        } else {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
            s.onload = init;
            document.body.appendChild(s);
        }
        return () => {
            if (inlineChartInst.current) inlineChartInst.current.destroy();
            const tooltipEl = chartContainer?.querySelector(".chart-heatmap-tooltip");
            if (tooltipEl) tooltipEl.remove();
        };
    }, [analysisData.heatmap_frames, analysisData.timeline_chart]);

    const onDownloadPdf = async () => {
        try {
            const target = reportCaptureRef.current;
            if (!target) {
                alert("리포트 영역을 찾을 수 없습니다.");
                return;
            }

            const pages = target.querySelectorAll(".pdf-page");
            if (!pages.length) {
                alert("PDF 페이지를 찾을 수 없습니다.");
                return;
            }

            const pdf = new jsPDF("p", "mm", "a4");

            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    windowWidth: 794,
                });

                const imgData = canvas.toDataURL("image/png");
                const pdfWidth = 210;
                const pdfHeight = 297;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            }

            pdf.save(`${reportDate.replace(/[.: ]/g, "_")}_분석결과.pdf`);
        } catch (error) {
            console.error(error);
            alert("PDF 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
        }
    };

    if (showFrameGraph) {
        return <FrameGraphPage onBack={() => setShowFrameGraph(false)} analysisData={analysisData} />;
    }

    const publicItems = analysisData.detailed_analysis.slice(0, 2);
    const proItems = analysisData.detailed_analysis.slice(2);

    return (
        <div id="main">
            <style>{`
                .verdict-banner { display:flex; align-items:center; gap:14px; border-radius:14px; padding:18px 22px; margin-top:18px; font-family:inherit; position:relative; overflow:hidden; animation:verdictIn .5s cubic-bezier(.22,1,.36,1) both; }
                @keyframes verdictIn { from{opacity:0;transform:translateY(8px) scale(.98)} to{opacity:1;transform:none} }
                .verdict-banner.danger { background:linear-gradient(135deg,#fff1f1,#ffe4e4); border:1.5px solid #f87171; box-shadow:0 4px 18px rgba(239,68,68,.12); }
                .verdict-banner.safe   { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1.5px solid #4ade80; box-shadow:0 4px 18px rgba(74,222,128,.12); }
                .verdict-icon { flex-shrink:0; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; }
                .verdict-banner.danger .verdict-icon { background:#fee2e2; }
                .verdict-banner.safe   .verdict-icon { background:#bbf7d0; }
                .verdict-text { flex:1; }
                .verdict-title { font-size:15px; font-weight:700; line-height:1.3; margin-bottom:3px; }
                .verdict-banner.danger .verdict-title { color:#b91c1c; }
                .verdict-banner.safe   .verdict-title { color:#15803d; }
                .verdict-desc { font-size:12px; line-height:1.5; color:#6b7280; }
                .verdict-pill { flex-shrink:0; padding:6px 13px; border-radius:999px; font-size:13px; font-weight:700; }
                .verdict-banner.danger .verdict-pill { background:#fecaca; color:#991b1b; }
                .verdict-banner.safe   .verdict-pill { background:#bbf7d0; color:#166534; }
                .verdict-banner::before { content:""; position:absolute; left:0;top:0;bottom:0; width:5px; border-radius:14px 0 0 14px; }
                .verdict-banner.danger::before { background:#ef4444; }
                .verdict-banner.safe::before   { background:#22c55e; }
                .video-meta-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px 16px; margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:6px 16px; }
                .meta-row { display:flex; gap:6px; align-items:flex-start; }
                .meta-label { color:#9ca3af; font-size:11px; white-space:nowrap; padding-top:1px; }
                .meta-val { color:#111827; font-size:12px; font-weight:600; word-break:break-all; }
                .rt-header-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
                .btn-deep-analysis { padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700; border:2px solid #2563eb; background:#fff; color:#2563eb; cursor:pointer; transition:all .15s; }
                .btn-deep-analysis:hover { background:#eff6ff; }
                .btn-pdf  { padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700; border:none; background:#2563eb; color:#fff; cursor:pointer; transition:background .15s; }
                .btn-pdf:hover { background:#1d4ed8; }
                .btn-back { padding:9px 16px; border-radius:8px; font-size:13px; font-weight:500; border:1.5px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; transition:all .15s; }
                .btn-back:hover { background:#f3f4f6; }
                .hamburger-wrap { position:relative; }
                .hamburger-btn { width:40px; height:40px; border-radius:8px; border:1.5px solid #e5e7eb; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; cursor:pointer; transition:all .15s; padding:0; }
                .hamburger-btn:hover { background:#f3f4f6; border-color:#d1d5db; }
                .hamburger-btn span { display:block; width:18px; height:2px; background:#374151; border-radius:2px; transition:all .2s; }
                .hamburger-btn.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
                .hamburger-btn.open span:nth-child(2) { opacity:0; }
                .hamburger-btn.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
                .hamburger-dropdown { position:absolute; right:0; top:calc(100% + 8px); background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.12); min-width:230px; z-index:100; overflow:hidden; animation:dropIn .18s cubic-bezier(.22,1,.36,1) both; }
                @keyframes dropIn { from{opacity:0;transform:translateY(-6px) scale(.97)} to{opacity:1;transform:none} }
                .hamburger-dropdown-header { padding:12px 16px 8px; font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid #f3f4f6; }
                .menu-item { display:flex; align-items:center; gap:10px; padding:12px 16px; font-size:13px; font-weight:500; color:#374151; cursor:pointer; transition:background .1s; }
                .menu-item:hover { background:#f9fafb; }
                .menu-icon { width:30px; height:30px; border-radius:8px; background:#eff6ff; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
                .menu-label-blue { font-size:13px; font-weight:600; color:#1d4ed8; }
                .menu-label-gray { font-size:13px; font-weight:600; color:#374151; }
                .menu-sub { font-size:11px; color:#9ca3af; margin-top:1px; }
                .menu-divider { height:1px; background:#f3f4f6; margin:0 16px; }
                .pro-items-wrapper { position:relative; border-radius:12px; overflow:hidden; margin-top:8px; }
                .pro-items-blur { filter:blur(4px) brightness(0.88); pointer-events:none; user-select:none; }
                .pro-lock-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:rgba(15,23,42,.52); backdrop-filter:blur(2px); border-radius:12px; z-index:5; }
                .pro-lock-icon { font-size:32px; }
                .pro-lock-title { font-size:15px; font-weight:800; color:#fff; }
                .pro-lock-desc { font-size:12px; color:#cbd5e1; text-align:center; max-width:200px; line-height:1.5; }
                .pro-lock-btn { padding:10px 24px; border-radius:8px; font-size:13px; font-weight:700; background:linear-gradient(135deg,#6366f1,#2563eb); color:#fff; border:none; cursor:pointer; margin-top:4px; transition:opacity .15s; }
                .pro-lock-btn:hover { opacity:.9; }
                .heatmap-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:16px; margin-top:4px; }
                .heatmap-cell { position:relative; border-radius:10px; overflow:hidden; background:#0f172a; aspect-ratio:3/4; }
                .heatmap-cell img { width:100%; height:100%; object-fit:contain; display:block; }
                .heatmap-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1e293b,#0f172a); min-height:160px; color:#cbd5e1; }
                .heatmap-cell-id { position:absolute; top:8px; left:8px; background:#E24B4A; color:#fff; font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; }
                .heatmap-cell-footer { position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.72); padding:7px 10px; }
                .heatmap-cell-row { display:flex; justify-content:space-between; }
                .heatmap-fake-label { color:#9ca3af; font-size:11px; }
                .heatmap-fake-val { color:#E24B4A; font-weight:700; font-size:12px; }
                .heatmap-real-label { color:#9ca3af; font-size:11px; }
                .heatmap-real-val { color:#d1d5db; font-weight:600; font-size:12px; }
                .heatmap-result-badge { display:inline-flex; align-items:center; gap:10px; background:#fff1f1; border:1.5px solid #fca5a5; border-radius:999px; padding:8px 20px 8px 8px; margin-bottom:20px; }
                .heatmap-badge-circle { width:52px; height:52px; border-radius:50%; border:3px solid #E24B4A; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fff; flex-shrink:0; }
                .heatmap-badge-label { font-size:9px; color:#E24B4A; font-weight:700; letter-spacing:.05em; margin-bottom:1px; }
                .heatmap-badge-count { font-size:18px; font-weight:800; color:#E24B4A; line-height:1; }
                .heatmap-badge-title { font-size:14px; font-weight:700; color:#111827; }
                /* 유튜브 영상 재생하기 : gallery 카드 안에서 유튜브 iframe 플레이어 크기를 기존 미리보기 영역에 맞춘다. */
                .youtube-player-wrap { width:100%; height:280px; background:#0b0b0b; }
                .youtube-player { width:100%; height:100%; border:0; display:block; }
            `}</style>

            <div className="wrap">
                <section id="resultPage" className="result-page" ref={reportRef}>
                    <div className="result-top" style={{ alignItems: "flex-start" }}>
                        <div className="rt-left">
                            <h2 className="rt-title">분석 결과 리포트</h2>
                            <p className="rt-sub">업로드한 영상의 위변조/AI 생성 의심 구간을 종합 분석했습니다.</p>
                        </div>
                        <div className="rt-right">
                            <div className="rt-header-actions">
                                <button
                                    type="button"
                                    className="btn-deep-analysis"
                                    onClick={() => !isPro && alert("Pro 구독 후 이용 가능한 기능입니다.")}
                                    title={isPro ? "심층 분석 실행" : "Pro 기능 — 업그레이드 필요"}
                                >
                                    {isPro ? "심층 분석" : "🔒 심층 분석"}
                                </button>
                                <button type="button" className="btn-pdf" onClick={onDownloadPdf}>
                                    분석 리포트 PDF 다운로드
                                </button>
                                <button type="button" className="btn-back" onClick={() => navigate("/")}>
                                    메인으로 돌아가기
                                </button>
                                <div className="hamburger-wrap" ref={menuRef}>
                                    <button
                                        className={`hamburger-btn${menuOpen ? " open" : ""}`}
                                        onClick={() => setMenuOpen((v) => !v)}
                                        aria-label="메뉴 열기"
                                    >
                                        <span /><span /><span />
                                    </button>
                                    {menuOpen && (
                                        <div className="hamburger-dropdown">
                                            <div className="hamburger-dropdown-header">분석 도구</div>
                                            <div className="menu-item" onClick={() => { setMenuOpen(false); setShowFrameGraph(true); }}>
                                                <div className="menu-icon">📈</div>
                                                <div>
                                                    <div className="menu-label-blue">프레임별 위조 의심도 그래프</div>
                                                    <div className="menu-sub">타임라인 & 히트맵 영상 보기</div>
                                                </div>
                                            </div>
                                            <div className="menu-divider" />
                                            <div className="menu-item" onClick={() => { setMenuOpen(false); navigate("/history"); }}>
                                                <div className="menu-icon" style={{ background: "#f0fdf4" }}>🕑</div>
                                                <div>
                                                    <div className="menu-label-gray">분석 히스토리</div>
                                                    <div className="menu-sub">이전 분석 결과 보기</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="result-grid">
                        <div className="card video-card">
                            <div className="card-head">
                                <h3>{videoTitle}</h3>
                                <span className={`badge ${isAiGenerated ? "warn" : "safe"}`}>{isAiGenerated ? "주의 필요" : "정상 판정"}</span>
                            </div>
                            <div className="video-preview">
                                {/* 유튜브 영상 재생하기 : 유튜브 링크 분석이면 iframe 플레이어를 우선 렌더링하고, 아니면 기존 video/img 미리보기를 사용한다. */}
                                {youtubeEmbedUrl ? (
                                    <div className="youtube-player-wrap">
                                        <iframe
                                            className="youtube-player"
                                            src={youtubeEmbedUrl}
                                            title={videoTitle}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : previewSrc ? (
                                    previewKind === "video" ? (
                                        <video className="gallery-preview-image" src={previewSrc} controls muted />
                                    ) : (
                                        <img className="gallery-preview-image" src={previewSrc} alt={videoTitle} />
                                    )
                                ) : (
                                    <div className="vp-dummy">영상 미리보기</div>
                                )}
                            </div>
                            <div className={`verdict-banner ${isAiGenerated ? "danger" : "safe"}`}>
                                <div className="verdict-icon">{isAiGenerated ? "⚠️" : "✅"}</div>
                                <div className="verdict-text">
                                    <div className="verdict-title">
                                        {isAiGenerated ? "이 영상은 AI 영상입니다." : "이 영상은 AI 영상이 아닙니다."}
                                    </div>
                                    <div className="verdict-desc">
                                        {isAiGenerated
                                            ? "AI 생성·조작 가능성이 높아 위변조가 의심됩니다."
                                            : `판별 정확도 ${trustScore}%로 정상 영상으로 판단됩니다.`}
                                    </div>
                                </div>
                                <div className="verdict-pill">{trustScore}%</div>
                            </div>
                        </div>

                        <div className="side-col">
                            <div className="card">
                                <h4 className="mini-title">판별 정확도</h4>
                                <div className="trust">
                                    <div className="trust-num">{trustScore}%</div>
                                    <div className="trust-sub">이 분석 결과의 신뢰도</div>
                                </div>
                            </div>
                            <div className="card">
                                <h4 className="mini-title">영상 정보</h4>
                                <ul className="info-list">
                                    <li><span>분석 시간</span><b>{analysisData.analysis_time ?? "14.2초"}</b></li>
                                    <li><span>영상 길이</span><b>{analysisData.video_duration ?? "2분 34초"}</b></li>
                                    <li><span>해상도</span><b>{analysisData.resolution ?? "1920×1080"}</b></li>
                                    <li><span>프레임 레이트</span><b>{analysisData.frame_rate ?? "30fps"}</b></li>
                                    <li><span>파일 크기</span><b>{analysisData.file_size ?? "245MB"}</b></li>
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                            <div>
                                <h3 className="section-title" style={{ marginBottom: 4 }}>프레임별 위조 의심도 그래프</h3>
                                <p className="hint" style={{ marginTop: 0 }}>총 {analysisData.timeline_chart.length}개 프레임 분석</p>
                            </div>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                                    <em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#E24B4A", fontStyle: "normal" }} />높음 (70%+)
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                                    <em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#EF9F27", fontStyle: "normal" }} />중간 (50–69%)
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                                    <em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#378ADD", fontStyle: "normal" }} />낮음 (50% 미만)
                                </span>
                            </div>
                        </div>
                        <div style={{ position: "relative", width: "100%", height: 220 }}>
                            <canvas ref={inlineChartRef} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>평균 위조 확률</p>
                                <p style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>{inlineFrameStats.avg}%</p>
                            </div>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>최고 의심 프레임</p>
                                <p style={{ fontSize: 20, fontWeight: 600, color: "#E24B4A", margin: 0 }}>Frame {inlineFrameStats.peakIdx}</p>
                            </div>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>위험 구간 수</p>
                                <p style={{ fontSize: 20, fontWeight: 600, color: "#E24B4A", margin: 0 }}>{inlineFrameStats.dangerCount}구간</p>
                            </div>
                        </div>
                    </div>

                    <div className="card section-card">
                        <h3 className="section-title">상세 분석 결과</h3>
                        {publicItems.map((item, i) => (
                            <div className="detail-item" key={`pub-${i}`}>
                                <div className="d-left">
                                    <div className="d-title">
                                        {item.title}{" "}
                                        <span className={`tag ${riskTag(item.risk_level)}`}>위험도: {item.risk_level}</span>
                                    </div>
                                    <div className="d-desc">{item.description}</div>
                                </div>
                                <div className="d-right">
                                    <div className="d-percent">{item.score_percent}%</div>
                                    <div className="d-sub">신뢰도</div>
                                </div>
                                <div className={`d-bar ${riskTag(item.risk_level)}`}>
                                    <span style={{ width: `${item.score_percent}%` }} />
                                </div>
                            </div>
                        ))}
                        {proItems.length > 0 && (
                            <div className="pro-items-wrapper">
                                <div className={isPro ? "" : "pro-items-blur"}>
                                    {proItems.map((item, i) => (
                                        <div className="detail-item" key={`pro-${i}`}>
                                            <div className="d-left">
                                                <div className="d-title">
                                                    {item.title}{" "}
                                                    <span className={`tag ${riskTag(item.risk_level)}`}>위험도: {item.risk_level}</span>
                                                </div>
                                                <div className="d-desc">{item.description}</div>
                                            </div>
                                            <div className="d-right">
                                                <div className="d-percent">{item.score_percent}%</div>
                                                <div className="d-sub">신뢰도</div>
                                            </div>
                                            <div className={`d-bar ${riskTag(item.risk_level)}`}>
                                                <span style={{ width: `${item.score_percent}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {!isPro && (
                                    <div className="pro-lock-overlay">
                                        <div className="pro-lock-icon">🔒</div>
                                        <div className="pro-lock-title">Pro 전용 분석 항목</div>
                                        <div className="pro-lock-desc">
                                            얼굴 경계 왜곡, 조명 일관성, 텍스처 분석 결과는<br />Pro 구독 후 확인 가능합니다.
                                        </div>
                                        <button className="pro-lock-btn" onClick={() => alert("Pro 업그레이드 페이지로 이동합니다.")}>
                                            Pro 구독하기
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {analysisData.heatmap_frames && analysisData.heatmap_frames.length > 0 && (
                        <div className="card section-card">
                            <h3 className="section-title">AI 생성 영상 탐지 히트맵</h3>
                            <p className="hint" style={{ marginTop: 0, marginBottom: 16 }}>
                                AI가 생성·조작 의심 영역을 열화상 오버레이로 시각화한 프레임입니다.
                            </p>
                            <div className="heatmap-result-badge">
                                <div className="heatmap-badge-circle">
                                    <span className="heatmap-badge-label">결과</span>
                                    <span className="heatmap-badge-count">
                                        {analysisData.heatmap_frames.filter((f) => f.fake_prob >= 50).length}
                                        <span style={{ fontSize: 14, fontWeight: 600 }}>/{analysisData.heatmap_frames.length}</span>
                                    </span>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>AI 생성 영상 탐지 결과</span>
                            </div>
                            <div className="heatmap-grid">
                                {analysisData.heatmap_frames.map((frame) => (
                                    <div className="heatmap-cell" key={frame.id}>
                                        {frame.image ? (
                                            <HeatmapImage className="heatmap-image" path={frame.image} alt={frame.id} />
                                        ) : (
                                            <div className="heatmap-placeholder">히트맵 이미지</div>
                                        )}
                                        <div className="heatmap-cell-id">{frame.id}</div>
                                        <div className="heatmap-cell-footer">
                                            <div className="heatmap-cell-row"><span className="heatmap-fake-label">AI 생성</span><span className="heatmap-fake-val">{frame.fake_prob.toFixed(2)}%</span></div>
                                            <div className="heatmap-cell-row"><span className="heatmap-real-label">실제 영상</span><span className="heatmap-real-val">{frame.real_prob.toFixed(2)}%</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pdf-area" />
                </section>
            </div>

            {/* PDF 캡처 전용 숨김 영역 */}
            <div
                style={{
                    position: "fixed",
                    left: "-100000px",
                    top: 0,
                    zIndex: -1,
                    pointerEvents: "none",
                }}
            >
                <div ref={reportCaptureRef}>
                    <PrintableReport
                        analysisData={analysisData}
                        inlineFrameStats={inlineFrameStats}
                        publicItems={publicItems}
                        reportDate={reportDate}
                    />
                </div>
            </div>
        </div>
    );
}

function normalizeAnalysisData(analysis, fallbackPreviewSrc, fallbackTitle) {
    const source = analysis || MOCK_ANALYSIS;

    return {
        analysis_id: source.analysis_id || source.analysisId || "H200_FALLBACK",
        filename: source.filename || fallbackTitle || "분석한 영상",
        final_prediction: source.final_prediction || source.finalPrediction || "REAL",
        overall_confidence_percent: Number(source.overall_confidence_percent ?? source.confidenceScore ?? 0),
        timeline_chart: Array.isArray(source.timeline_chart) && source.timeline_chart.length > 0
            ? source.timeline_chart
            : MOCK_ANALYSIS.timeline_chart,
        heatmap_frames: Array.isArray(source.heatmap_frames)
            ? source.heatmap_frames.map((frame) => ({
                ...frame,
                frame_index: frame.frame_index ?? frame.frame_idx ?? null,
                image: resolveAnalyzeAssetUrl(frame.image || frame.image_url || null),
            }))
            : Array.isArray(source.decisive_frames)
                ? source.decisive_frames.map((frame) => ({
                    id: `Frame ${frame.frame_index}`,
                    frame_index: Number(frame.frame_index ?? 0),
                    fake_prob: Number(frame.fake_prob ?? 0),
                    real_prob: Number(frame.real_prob ?? 0),
                    image: resolveAnalyzeAssetUrl(frame.image_url || null),
                }))
                : MOCK_ANALYSIS.heatmap_frames,
        detailed_analysis: Array.isArray(source.detailed_analysis) && source.detailed_analysis.length > 0
            ? source.detailed_analysis
            : MOCK_ANALYSIS.detailed_analysis,
        analysis_time: source.analysis_time || (source.processTimeSeconds ? `${Number(source.processTimeSeconds).toFixed(1)}초` : undefined),
        video_duration: source.video_duration || source.duration,
        resolution: source.resolution,
        frame_rate: source.frame_rate || source.frameRate,
        file_size: source.file_size || source.fileSize,
        thumbnail: source.thumbnail || fallbackPreviewSrc || "",
    };
}
