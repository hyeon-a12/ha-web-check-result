// src/pages/Gallery.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import PrintableReport from "../components/PrintableReport";
import LoadingOverlay from "../components/LoadingOverlay";
import { fetchAnalyzeReport, fetchNgrokImage, resolveGalleryImageUrl } from "../services/api";

// ─────────────────────────────────────────────────────────────
// 임시 JSON 데이터 (실제 서비스에서는 API 응답으로 교체)
// ─────────────────────────────────────────────────────────────
const MOCK_ANALYSIS = {
    analysis_id: "H200_20260312170203",
    filename: "test_0006_(북한 실제영상) 평양의 아침 8시30분 풍경은 어떨까？.mp4",
    final_prediction: "REAL",
    overall_confidence_percent: 85.82,
    analysis_time: "14.2초",
    video_duration: "2분 34초",
    resolution: "1920×1080",
    frame_rate: "30fps",
    file_size: "245MB",
    model_names: ["Vision Transformer", "ResNet-50", "XceptionNet"],
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
        { id: "VSLN-1", frame_idx: 1, fake_prob: 99.95, real_prob: 0.05, image: null },
        { id: "VSLN-2", frame_idx: 2, fake_prob: 92.15, real_prob: 7.85, image: null },
        { id: "VSLN-3", frame_idx: 3, fake_prob: 98.95, real_prob: 1.05, image: null },
        { id: "VSLN-4", frame_idx: 4, fake_prob: 88.35, real_prob: 11.65, image: null },
        { id: "VSLN-5", frame_idx: 5, fake_prob: 96.91, real_prob: 3.09, image: null },
        { id: "VSLN-6", frame_idx: 6, fake_prob: 82.51, real_prob: 17.49, image: null },
        { id: "VSLN-7", frame_idx: 7, fake_prob: 77.51, real_prob: 22.49, image: null },
        { id: "VSLN-8", frame_idx: 8, fake_prob: 60.51, real_prob: 39.49, image: null },
        { id: "VSLN-9", frame_idx: 9, fake_prob: 54.26, real_prob: 45.74, image: null },
        { id: "VSLN-10", frame_idx: 10, fake_prob: 57.51, real_prob: 42.49, image: null },
        { id: "VSLN-11", frame_idx: 11, fake_prob: 35.44, real_prob: 64.56, image: null },
        { id: "VSLN-12", frame_idx: 12, fake_prob: 27.51, real_prob: 72.49, image: null },
        { id: "VSLN-13", frame_idx: 13, fake_prob: 48.12, real_prob: 51.88, image: null },
        { id: "VSLN-14", frame_idx: 14, fake_prob: 70.51, real_prob: 29.49, image: null },
        { id: "VSLN-15", frame_idx: 15, fake_prob: 52.88, real_prob: 47.12, image: null },
        { id: "VSLN-16", frame_idx: 16, fake_prob: 65.51, real_prob: 34.49, image: null },
    ],
    detailed_analysis: [
        {
            title: "프레임 전환 일관성 위험도",
            risk_level: "낮음",
            score_percent: 40.7,
            description:
                "프레임 전환 시 얼굴이나 배경의 미세한 떨림 및 시공간적 비일관성이 40.7% 수준으로 감지되었습니다.",
        },
        {
            title: "공간적 텍스처 및 화질 왜곡 위험도",
            risk_level: "낮음",
            score_percent: 28.7,
            description:
                "이미지 생성 과정에서 발생하는 인위적인 픽셀 뭉개짐이나 텍스처 이상 징후가 28.7% 확률로 감지되었습니다.",
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

function normalizeHeatmapFrames(analysisData) {
    const timeline = analysisData.timeline_chart ?? [];
    const rawHeatmaps = analysisData.heatmap_frames ?? [];

    return timeline.map((frame, idx) => {
        const matched =
            rawHeatmaps.find((h) => h.frame_idx === frame.frame_idx) ||
            rawHeatmaps[idx] ||
            null;

        const fakeProb = matched?.fake_prob ?? frame.fake_prob ?? 0;
        const realProb = matched?.real_prob ?? Math.max(0, 100 - fakeProb);

        return {
            id: matched?.id ?? `Frame-${frame.frame_idx}`,
            frame_idx: frame.frame_idx,
            fake_prob: fakeProb,
            real_prob: realProb,
            image: matched?.image ?? null,
            risk:
                frame.risk ??
                (fakeProb >= 70 ? "높음" : fakeProb >= 50 ? "중간" : "낮음"),
        };
    });
}

function getHeatmapGalleryData(frames) {
    const sorted = [...frames].sort((a, b) => b.fake_prob - a.fake_prob);
    const featured = sorted.slice(0, 4);
    const remaining = sorted.slice(4);
    return { featured, remaining };
}

function renderSummaryMarkdown(summaryText) {
    if (!summaryText) return null;

    const formattedText = summaryText
        .replace(/\\n/g, "\n")
        .split(/\r?\n/)
        .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1"))
        .join("\n")
        .trim();

    return (
        <div style={{ whiteSpace: "pre-wrap" }}>
            {formattedText}
        </div>
    );
}

// ─── PDF 진행률 시뮬레이터 ────────────────────────────────────
// html2canvas / jsPDF 는 진행 콜백이 없으므로
// easeOutCubic 곡선으로 92%까지 부드럽게 올라가는 시뮬레이션을 씁니다.
function simulatePdfProgress(setter, totalMs = 9000) {
    const TICK = 120;
    const SOFT_CAP = 92;
    let elapsed = 0;

    const id = setInterval(() => {
        elapsed += TICK;
        const t = Math.min(elapsed / totalMs, 1);
        const raw = SOFT_CAP * (1 - Math.pow(1 - t, 3));
        setter(Math.round(raw));
        if (raw >= SOFT_CAP) clearInterval(id);
    }, TICK);

    return id;
}

function normalizeAnalysisData(rawAnalysis) {
    if (!rawAnalysis) {
        return MOCK_ANALYSIS;
    }

    const analysisId = rawAnalysis.analysis_id || rawAnalysis.analysisId || "";
    const confidence = Number(
        rawAnalysis.overall_confidence_percent ?? rawAnalysis.confidenceScore ?? 0
    );
    const processTimeSeconds = Number(
        rawAnalysis.process_time_seconds ?? rawAnalysis.processTimeSeconds ?? 0
    );
    const timelineChart = Array.isArray(rawAnalysis.timeline_chart) ? rawAnalysis.timeline_chart : [];
    const decisiveFrames = Array.isArray(rawAnalysis.decisive_frames) ? rawAnalysis.decisive_frames : [];
    const otherFrames = Array.isArray(rawAnalysis.other_frames) ? rawAnalysis.other_frames : [];
    const heatmapFrames = [...decisiveFrames, ...otherFrames].map((frame, index) => ({
        id: frame.id || `Frame-${frame.frame_index ?? frame.frame_idx ?? index + 1}`,
        frame_idx: frame.frame_idx ?? frame.frame_index ?? 0,
        fake_prob: Number(frame.fake_prob ?? 0),
        real_prob: Number(frame.real_prob ?? Math.max(0, 100 - Number(frame.fake_prob ?? 0))),
        image: resolveGalleryImageUrl(frame.image || frame.image_url || ""),
        risk: frame.risk,
    }));

    const normalizedAnalysis = {
        ...MOCK_ANALYSIS,
        ...rawAnalysis,
        analysis_id: analysisId || MOCK_ANALYSIS.analysis_id,
        filename: rawAnalysis.filename || MOCK_ANALYSIS.filename,
        ai_summary: rawAnalysis.ai_summary || rawAnalysis.aiSummary || "",
        final_prediction: rawAnalysis.final_prediction || rawAnalysis.finalPrediction || MOCK_ANALYSIS.final_prediction,
        overall_confidence_percent: confidence || MOCK_ANALYSIS.overall_confidence_percent,
        process_time_seconds: processTimeSeconds,
        analysis_time:
            rawAnalysis.analysis_time ||
            (processTimeSeconds > 0 ? `${processTimeSeconds.toFixed(1)}초` : MOCK_ANALYSIS.analysis_time),
        timeline_chart: timelineChart.length > 0 ? timelineChart : MOCK_ANALYSIS.timeline_chart,
        detailed_analysis: Array.isArray(rawAnalysis.detailed_analysis)
            ? rawAnalysis.detailed_analysis
            : MOCK_ANALYSIS.detailed_analysis,
        decisive_frames: decisiveFrames,
        other_frames: otherFrames,
        heatmap_frames: heatmapFrames.length > 0
            ? heatmapFrames
            : (rawAnalysis.heatmap_frames || MOCK_ANALYSIS.heatmap_frames),
        model_names: Array.isArray(rawAnalysis.model_names) && rawAnalysis.model_names.length > 0
            ? rawAnalysis.model_names
            : MOCK_ANALYSIS.model_names,
        video_duration: rawAnalysis.video_duration || rawAnalysis.duration || MOCK_ANALYSIS.video_duration,
        resolution: rawAnalysis.resolution || MOCK_ANALYSIS.resolution,
        frame_rate: rawAnalysis.frame_rate || MOCK_ANALYSIS.frame_rate,
        file_size: rawAnalysis.file_size || MOCK_ANALYSIS.file_size,
    };

    normalizedAnalysis.analysis_time =
        rawAnalysis.analysis_time ||
        (processTimeSeconds > 0
            ? `${processTimeSeconds.toFixed(1)}초`
            : MOCK_ANALYSIS.analysis_time);

    return normalizedAnalysis;
}

function buildReportPayload(analysisData) {
    return {
        analysis_id: analysisData.analysis_id,
        filename: analysisData.filename,
        final_prediction: analysisData.final_prediction,
        overall_confidence_percent: analysisData.overall_confidence_percent,
        analysis_time: analysisData.analysis_time,
        video_duration: analysisData.video_duration,
        resolution: analysisData.resolution,
        frame_rate: analysisData.frame_rate,
        file_size: analysisData.file_size,
        model_names: analysisData.model_names,
        timeline_chart: analysisData.timeline_chart,
        detailed_analysis: analysisData.detailed_analysis,
        decisive_frames: analysisData.decisive_frames,
        other_frames: analysisData.other_frames,
    };
}

function sanitizePdfFileName(name) {
    return (name || "분석결과")
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, " ")
        .trim();
}

function waitForImagesToLoad(root) {
    if (!root) return Promise.resolve();

    const images = Array.from(root.querySelectorAll("img"));
    const pendingImages = images.filter((image) => !image.complete);

    return Promise.all(
        pendingImages.map(
            (image) =>
                new Promise((resolve) => {
                    const done = () => {
                        image.removeEventListener("load", done);
                        image.removeEventListener("error", done);
                        resolve();
                    };

                    image.addEventListener("load", done, { once: true });
                    image.addEventListener("error", done, { once: true });
                })
        )
    );
}

function buildPdfComparisonNotes(analysisData, displayTitle, reportPayload, forensicOpinion) {
    const notes = [];
    const pdfTitle = displayTitle || analysisData.filename || "-";
    const jsonFileName = analysisData.filename || "-";
    const decisiveCount = Array.isArray(analysisData.decisive_frames) ? analysisData.decisive_frames.length : 0;
    const otherCount = Array.isArray(analysisData.other_frames) ? analysisData.other_frames.length : 0;
    const detailCount = Array.isArray(analysisData.detailed_analysis) ? analysisData.detailed_analysis.length : 0;

    notes.push(`PDF 표시 제목: ${pdfTitle}`);
    notes.push(`JSON filename: ${jsonFileName}`);
    if (pdfTitle !== jsonFileName) {
        notes.push(`표시 제목과 JSON filename이 다릅니다.`);
    }
    notes.push(`JSON final_prediction: ${analysisData.final_prediction}`);
    notes.push(`JSON overall_confidence_percent: ${Number(analysisData.overall_confidence_percent ?? 0).toFixed(2)}%`);
    if (analysisData.process_time_seconds) {
        notes.push(`JSON process_time_seconds: ${analysisData.process_time_seconds}s`);
    }
    notes.push(`JSON detailed_analysis 항목 수: ${detailCount}`);
    notes.push(`JSON decisive_frames 수: ${decisiveCount}`);
    notes.push(`JSON other_frames 수: ${otherCount}`);
    notes.push(`REPORT payload filename: ${reportPayload?.filename || "-"}`);
    notes.push(`REPORT forensic_opinion 존재 여부: ${forensicOpinion ? "있음" : "없음"}`);

    return notes;
}

function buildChartTooltipFrame(frame, heatmapFrame) {
    if (!frame) return null;

    const fakeProb = Number(heatmapFrame?.fake_prob ?? frame.fake_prob ?? 0);
    const realProb = Number(heatmapFrame?.real_prob ?? Math.max(0, 100 - fakeProb));

    return {
        frame_idx: frame.frame_idx,
        fake_prob: fakeProb,
        real_prob: realProb,
        risk: frame.risk ?? heatmapFrame?.risk ?? (fakeProb >= 70 ? "높음" : fakeProb >= 50 ? "중간" : "낮음"),
        image: heatmapFrame?.image || null,
    };
}

function getTooltipPosition(x, y, width, height, boundsWidth, boundsHeight) {
    const gap = 12;
    const preferRight = x + gap + width <= boundsWidth - 8;
    const left = preferRight
        ? x + gap
        : Math.max(8, x - width - gap);
    const top = Math.min(
        Math.max(8, y - height / 2),
        Math.max(8, boundsHeight - height - 8)
    );

    return { left, top };
}

function AdaptiveHeatmapImage({
    src,
    alt,
    defaultAspectRatio = "9 / 16",
    maxHeight = null,
    minHeight = null,
    borderRadius = 0,
    background = "#0f172a",
}) {
    const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);

    return (
        <div
            style={{
                width: "100%",
                aspectRatio,
                maxHeight: maxHeight ?? undefined,
                minHeight: minHeight ?? undefined,
                background,
                borderRadius,
                overflow: "hidden",
            }}
        >
            <img
                src={src}
                alt={alt}
                onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth > 0 && naturalHeight > 0) {
                        setAspectRatio(`${naturalWidth} / ${naturalHeight}`);
                    }
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    background,
                }}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// 재사용 히트맵 갤러리
// ─────────────────────────────────────────────────────────────
function HeatmapGallerySection({
    frames,
    title = "AI 생성 영상 탐지 히트맵",
    description = "상위 4개 고위험 프레임을 우선 노출하고, 나머지 프레임은 탭으로 확인할 수 있습니다.",
}) {
    const { featured, remaining } = useMemo(
        () => getHeatmapGalleryData(frames),
        [frames]
    );

    const [activeSection, setActiveSection] = useState("featured");
    const [selectedFrameId, setSelectedFrameId] = useState(remaining[0]?.id ?? null);

    useEffect(() => {
        if (!remaining.length) {
            setSelectedFrameId(null);
            return;
        }
        if (!remaining.some((item) => item.id === selectedFrameId)) {
            setSelectedFrameId(remaining[0].id);
        }
    }, [remaining, selectedFrameId]);

    const selectedFrame =
        remaining.find((item) => item.id === selectedFrameId) ?? remaining[0] ?? null;

    const suspiciousCount = frames.filter((f) => f.fake_prob >= 50).length;

    return (
        <>
            <style>{`
                .heatmap-gallery-summary {
                    display:flex;
                    align-items:center;
                    gap:12px;
                    flex-wrap:wrap;
                    margin-bottom:18px;
                }
                .heatmap-result-badge {
                    display:inline-flex;
                    align-items:center;
                    gap:10px;
                    background:#fff1f1;
                    border:1.5px solid #fca5a5;
                    border-radius:999px;
                    padding:8px 20px 8px 8px;
                }
                .heatmap-badge-circle {
                    width:52px;
                    height:52px;
                    border-radius:50%;
                    border:3px solid #E24B4A;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    background:#fff;
                    flex-shrink:0;
                }
                .heatmap-badge-label {
                    font-size:9px;
                    color:#E24B4A;
                    font-weight:700;
                    letter-spacing:.05em;
                    margin-bottom:1px;
                }
                .heatmap-badge-count {
                    font-size:18px;
                    font-weight:800;
                    color:#E24B4A;
                    line-height:1;
                }
                .heatmap-badge-title {
                    font-size:14px;
                    font-weight:700;
                    color:#111827;
                }
                .heatmap-guide-chip {
                    padding:8px 12px;
                    border-radius:999px;
                    background:#eff6ff;
                    color:#1d4ed8;
                    font-size:12px;
                    font-weight:700;
                    border:1px solid #bfdbfe;
                    cursor:pointer;
                    transition:all .15s ease;
                }
                .heatmap-guide-chip.active {
                    background:#dbeafe;
                    color:#1d4ed8;
                    border-color:#93c5fd;
                    box-shadow:inset 0 0 0 1px #93c5fd;
                }
                .heatmap-guide-chip:hover {
                    background:#dbeafe;
                }
                .heatmap-gallery-block + .heatmap-gallery-block {
                    margin-top:24px;
                }
                .heatmap-subtitle {
                    font-size:15px;
                    font-weight:700;
                    color:#111827;
                    margin:0 0 6px;
                }
                .heatmap-subdesc {
                    font-size:12px;
                    color:#9ca3af;
                    margin:0 0 14px;
                }
                .heatmap-grid {
                    display:grid;
                    grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
                    gap:16px;
                }
                .heatmap-cell {
                    position:relative;
                    border-radius:14px;
                    overflow:hidden;
                    background:#0f172a;
                    border:1px solid #1e293b;
                    box-shadow:0 4px 14px rgba(15,23,42,.12);
                }
                .heatmap-image {
                    width:100%;
                    display:block;
                }
                .heatmap-placeholder {
                    width:100%;
                    height:100%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:linear-gradient(135deg,#1e293b,#0f172a);
                    min-height:160px;
                }
                .heatmap-placeholder-inner {
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    gap:8px;
                }
                .heatmap-cell-id {
                    position:absolute;
                    top:8px;
                    left:8px;
                    background:#E24B4A;
                    color:#fff;
                    font-size:10px;
                    font-weight:700;
                    padding:2px 7px;
                    border-radius:4px;
                    letter-spacing:.04em;
                }
                .heatmap-frame-badge {
                    position:absolute;
                    top:8px;
                    right:8px;
                    background:rgba(15,23,42,.82);
                    color:#fff;
                    font-size:10px;
                    font-weight:700;
                    padding:3px 8px;
                    border-radius:999px;
                    z-index:2;
                }
                .heatmap-cell-footer {
                    position:absolute;
                    bottom:0;
                    left:0;
                    right:0;
                    background:rgba(0,0,0,0.72);
                    backdrop-filter:blur(4px);
                    padding:7px 10px;
                }
                .heatmap-cell-row {
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                }
                .heatmap-fake-label,
                .heatmap-real-label {
                    color:#9ca3af;
                    font-size:11px;
                }
                .heatmap-fake-val {
                    color:#E24B4A;
                    font-weight:700;
                    font-size:12px;
                }
                .heatmap-real-val {
                    color:#d1d5db;
                    font-weight:600;
                    font-size:12px;
                }
                .heatmap-tabs {
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                    margin-bottom:16px;
                }
                .heatmap-tab {
                    border:none;
                    cursor:pointer;
                    border-radius:999px;
                    padding:9px 14px;
                    font-size:12px;
                    font-weight:700;
                    background:#f3f4f6;
                    color:#6b7280;
                    transition:all .15s ease;
                }
                .heatmap-tab:hover {
                    background:#e5e7eb;
                    color:#374151;
                }
                .heatmap-tab.active {
                    background:#dbeafe;
                    color:#1d4ed8;
                    box-shadow:inset 0 0 0 1px #93c5fd;
                }
                .heatmap-gallery-preview {
                    display:grid;
                    grid-template-columns:minmax(160px, 0.7fr) minmax(260px, 1.3fr);
                    gap:16px;
                    align-items:start;
                }
                .heatmap-preview-card {
                    position:relative;
                    border-radius:16px;
                    overflow:hidden;
                    background:#0f172a;
                    min-height:170px;
                    border:1px solid #1e293b;
                    box-shadow:0 6px 18px rgba(15,23,42,.12);
                }
                .heatmap-preview-image {
                    width:100%;
                    display:block;
                }
                .heatmap-preview-placeholder {
                    width:100%;
                    height:100%;
                    min-height:170px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:linear-gradient(135deg,#1e293b,#0f172a);
                }
                .heatmap-preview-side {
                    background:#f8fafc;
                    border:1px solid #e5e7eb;
                    border-radius:16px;
                    padding:18px;
                    display:flex;
                    flex-direction:column;
                    justify-content:space-between;
                    gap:14px;
                }
                .heatmap-side-top {
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                }
                .heatmap-side-title {
                    font-size:18px;
                    font-weight:800;
                    color:#111827;
                    margin:0;
                }
                .heatmap-side-id {
                    display:inline-flex;
                    align-items:center;
                    width:max-content;
                    padding:5px 10px;
                    border-radius:999px;
                    background:#fee2e2;
                    color:#b91c1c;
                    font-size:11px;
                    font-weight:800;
                }
                .heatmap-side-info {
                    display:grid;
                    grid-template-columns:1fr;
                    gap:10px;
                }
                .heatmap-side-box {
                    border-radius:12px;
                    background:#fff;
                    border:1px solid #e5e7eb;
                    padding:12px 14px;
                }
                .heatmap-side-label {
                    font-size:11px;
                    color:#9ca3af;
                    margin-bottom:4px;
                }
                .heatmap-side-value {
                    font-size:18px;
                    font-weight:800;
                    color:#111827;
                }
                .heatmap-side-value.red { color:#E24B4A; }
                .heatmap-side-value.blue { color:#2563eb; }
                .heatmap-side-risk {
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    width:max-content;
                    padding:7px 12px;
                    border-radius:999px;
                    font-size:12px;
                    font-weight:800;
                    background:#fff7ed;
                    color:#c2410c;
                    border:1px solid #fdba74;
                }
                @media (max-width: 900px) {
                    .heatmap-gallery-preview { grid-template-columns:1fr; }
                }
            `}</style>

            <div>
                <h3 className="section-title">{title}</h3>
                <p className="hint" style={{ marginTop: 0, marginBottom: 16 }}>
                    {description}
                </p>

                <div className="heatmap-gallery-summary">
                    <div className="heatmap-result-badge">
                        <div className="heatmap-badge-circle">
                            <span className="heatmap-badge-label">결과</span>
                            <span className="heatmap-badge-count">
                                {suspiciousCount}
                                <span style={{ fontSize: 14, fontWeight: 600 }}>/{frames.length}</span>
                            </span>
                        </div>
                        <span className="heatmap-badge-title">의심 프레임 감지</span>
                    </div>
                    <button
                        type="button"
                        className={`heatmap-guide-chip${activeSection === "featured" ? " active" : ""}`}
                        onClick={() => setActiveSection("featured")}
                    >
                        상위 4개 프레임
                    </button>
                    <button
                        type="button"
                        className={`heatmap-guide-chip${activeSection === "remaining" ? " active" : ""}`}
                        onClick={() => setActiveSection("remaining")}
                    >
                        전체 프레임 확인
                    </button>
                </div>

                {featured.length > 0 && activeSection === "featured" && (
                    <div className="heatmap-gallery-block">
                        <h4 className="heatmap-subtitle">위조 확률 상위 4개 프레임</h4>
                        <p className="heatmap-subdesc">
                            `fake_prob` 기준으로 가장 높은 프레임만 먼저 보여줍니다.
                        </p>
                        <div className="heatmap-grid">
                            {featured.map((frame) => (
                                <div className="heatmap-cell" key={`featured-${frame.frame_idx}-${frame.id}`}>
                                    {frame.image ? (
                                        <AdaptiveHeatmapImage
                                            src={frame.image}
                                            alt={`heatmap-${frame.id}`}
                                            minHeight={220}
                                            borderRadius={0}
                                        />
                                    ) : (
                                        <div className="heatmap-placeholder">
                                            <div className="heatmap-placeholder-inner">
                                                <span style={{ fontSize: 28 }}>🌡️</span>
                                                <span style={{ fontSize: 11, color: "#cbd5e1" }}>히트맵 이미지 없음</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="heatmap-cell-id">{frame.id}</div>
                                    <div className="heatmap-frame-badge">Frame {frame.frame_idx}</div>
                                    <div className="heatmap-cell-footer">
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <div className="heatmap-cell-row">
                                                <span className="heatmap-fake-label">AI 생성</span>
                                                <span className="heatmap-fake-val">{frame.fake_prob.toFixed(2)}%</span>
                                            </div>
                                            <div className="heatmap-cell-row">
                                                <span className="heatmap-real-label">실제 영상</span>
                                                <span className="heatmap-real-val">{frame.real_prob.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {remaining.length > 0 && activeSection === "remaining" && (
                    <div className="heatmap-gallery-block">
                        <h4 className="heatmap-subtitle">히트맵 프레임 갤러리</h4>
                        <p className="heatmap-subdesc">
                            프레임 탭을 클릭하면 해당 히트맵을 크게 볼 수 있습니다.
                        </p>
                        <div className="heatmap-tabs">
                            {remaining.map((frame) => (
                                <button
                                    key={`tab-${frame.id}`}
                                    type="button"
                                    className={`heatmap-tab${selectedFrame?.id === frame.id ? " active" : ""}`}
                                    onClick={() => setSelectedFrameId(frame.id)}
                                >
                                    Frame {frame.frame_idx}
                                </button>
                            ))}
                        </div>
                        {selectedFrame && (
                            <div className="heatmap-gallery-preview">
                                <div className="heatmap-preview-card">
                                    {selectedFrame.image ? (
                                        <AdaptiveHeatmapImage
                                            src={selectedFrame.image}
                                            alt={`heatmap-preview-${selectedFrame.id}`}
                                            minHeight={170}
                                            maxHeight={360}
                                            borderRadius={0}
                                        />
                                    ) : (
                                        <div className="heatmap-preview-placeholder">
                                            <div className="heatmap-placeholder-inner">
                                                <span style={{ fontSize: 36 }}>🌡️</span>
                                                <span style={{ fontSize: 12, color: "#cbd5e1" }}>선택한 프레임의 히트맵 이미지 없음</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="heatmap-cell-id">{selectedFrame.id}</div>
                                    <div className="heatmap-frame-badge">Frame {selectedFrame.frame_idx}</div>
                                    <div className="heatmap-cell-footer">
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <div className="heatmap-cell-row">
                                                <span className="heatmap-fake-label">AI 생성</span>
                                                <span className="heatmap-fake-val">{selectedFrame.fake_prob.toFixed(2)}%</span>
                                            </div>
                                            <div className="heatmap-cell-row">
                                                <span className="heatmap-real-label">실제 영상</span>
                                                <span className="heatmap-real-val">{selectedFrame.real_prob.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="heatmap-preview-side">
                                    <div className="heatmap-side-top">
                                        <span className="heatmap-side-id">{selectedFrame.id}</span>
                                        <h5 className="heatmap-side-title">Frame {selectedFrame.frame_idx} 상세 정보</h5>
                                        <span className="heatmap-side-risk">위험도: {selectedFrame.risk}</span>
                                    </div>
                                    <div className="heatmap-side-info">
                                        <div className="heatmap-side-box">
                                            <div className="heatmap-side-label">AI 생성 확률</div>
                                            <div className="heatmap-side-value red">{selectedFrame.fake_prob.toFixed(2)}%</div>
                                        </div>
                                        <div className="heatmap-side-box">
                                            <div className="heatmap-side-label">실제 영상 확률</div>
                                            <div className="heatmap-side-value blue">{selectedFrame.real_prob.toFixed(2)}%</div>
                                        </div>
                                        <div className="heatmap-side-box">
                                            <div className="heatmap-side-label">분석 기준</div>
                                            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                                                상위 4개에 포함되지 않은 프레임 중 선택된 히트맵입니다.
                                                탭을 눌러 다른 프레임도 바로 비교할 수 있습니다.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────
// FrameGraphPage
// ─────────────────────────────────────────────────────────────
function FrameGraphPage({ onBack, analysisData }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const { timeline_chart } = analysisData;
    const [hoveredFrame, setHoveredFrame] = useState(null);
    const frameTooltipSize = { width: 260, height: 252 };

    const displayHeatmapFrames = useMemo(
        () => normalizeHeatmapFrames(analysisData),
        [analysisData]
    );

    const frameStats = useMemo(() => {
        const probs = timeline_chart.map((f) => f.fake_prob);
        const avg = Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 10) / 10;
        const peak = Math.max(...probs);
        const peakIdx = probs.findIndex((p) => p === peak) + 1;
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
                    datasets: [{
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
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: false,
                            external: ({ tooltip }) => {
                                if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
                                    setHoveredFrame(null);
                                    return;
                                }

                                const point = tooltip.dataPoints[0];
                                const frame = timeline_chart[point.dataIndex];
                                const heatmapFrame = displayHeatmapFrames.find(
                                    (item) => item.frame_idx === frame?.frame_idx
                                );

                                setHoveredFrame({
                                    ...buildChartTooltipFrame(frame, heatmapFrame),
                                    x: tooltip.caretX,
                                    y: tooltip.caretY,
                                });
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 11 }, color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                            grid: { display: false },
                        },
                        y: {
                            min: 0, max: 100,
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
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [displayHeatmapFrames, timeline_chart]);

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "inherit" }}>
            <style>{`
                .fg-header {
                    background:#fff; border-bottom:1px solid #e5e7eb;
                    padding:16px 32px; display:flex; align-items:center;
                    gap:16px; position:sticky; top:0; z-index:10;
                }
                .fg-back-btn {
                    display:flex; align-items:center; gap:6px;
                    padding:8px 16px; border:1.5px solid #e5e7eb;
                    border-radius:8px; background:#fff; font-size:13px;
                    color:#374151; cursor:pointer; font-weight:500; transition:all .15s;
                }
                .fg-back-btn:hover { background:#f3f4f6; border-color:#d1d5db; }
                .fg-body {
                    max-width:1100px; margin:0 auto; padding:32px 24px;
                    display:flex; flex-direction:column; gap:24px;
                }
                .fg-card {
                    background:#fff; border-radius:16px; border:1px solid #e5e7eb;
                    padding:28px; box-shadow:0 1px 6px rgba(0,0,0,.05);
                }
                .fg-card-title { font-size:16px; font-weight:700; color:#111827; margin:0 0 6px; }
                .fg-legend { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
                .fg-legend span { display:flex; align-items:center; gap:6px; font-size:12px; color:#6b7280; }
                .fg-legend em { display:inline-block; width:10px; height:10px; border-radius:2px; font-style:normal; }
                .fg-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:20px; }
                .fg-stat-box { background:#f9fafb; border-radius:12px; padding:16px; text-align:center; }
                .fg-stat-label { font-size:11px; color:#9ca3af; margin:0 0 6px; }
                .fg-stat-value { font-size:22px; font-weight:700; color:#111827; margin:0; }
                .fg-stat-value.danger { color:#E24B4A; }
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
                        {hoveredFrame && (
                            <div
                                    {...(() => {
                                        const boundsWidth = chartRef.current?.parentElement?.clientWidth ?? 1100;
                                        const pos = getTooltipPosition(
                                            hoveredFrame.x,
                                            hoveredFrame.y,
                                            frameTooltipSize.width,
                                            frameTooltipSize.height,
                                            boundsWidth,
                                            280
                                        );
                                    return {
                                        style: {
                                            position: "absolute",
                                            left: pos.left,
                                            top: pos.top,
                                            width: frameTooltipSize.width,
                                            background: "rgba(15,23,42,0.96)",
                                            color: "#fff",
                                            borderRadius: 12,
                                            overflow: "hidden",
                                            boxShadow: "0 12px 28px rgba(15,23,42,.28)",
                                            pointerEvents: "none",
                                            zIndex: 4,
                                        },
                                    };
                                })()}
                            >
                                {hoveredFrame.image ? (
                                    <AdaptiveHeatmapImage
                                        src={hoveredFrame.image}
                                        alt={`frame-${hoveredFrame.frame_idx}`}
                                        minHeight={192}
                                        maxHeight={320}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: "100%",
                                            height: 192,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#1e293b",
                                            color: "#cbd5e1",
                                            fontSize: 12,
                                            fontWeight: 700,
                                        }}
                                    >
                                        히트맵 없음
                                    </div>
                                )}
                                <div style={{ padding: "10px 12px", display: "grid", gap: 4 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800 }}>Frame {hoveredFrame.frame_idx}</div>
                                    <div style={{ fontSize: 12, color: "#fca5a5" }}>위조 확률 {hoveredFrame.fake_prob.toFixed(2)}%</div>
                                    <div style={{ fontSize: 12, color: "#93c5fd" }}>실제 확률 {hoveredFrame.real_prob.toFixed(2)}%</div>
                                    <div style={{ fontSize: 11, color: "#cbd5e1" }}>위험도: {hoveredFrame.risk}</div>
                                </div>
                            </div>
                        )}
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
                    <HeatmapGallerySection
                        frames={displayHeatmapFrames}
                        title="프레임별 히트맵"
                        description="상위 4개 고위험 프레임을 먼저 표시하고, 나머지 프레임은 탭으로 전환해 확인할 수 있습니다."
                    />
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main GalleryPage
// ─────────────────────────────────────────────────────────────
export default function GalleryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [analysisData, setAnalysisData] = useState(() => normalizeAnalysisData(location.state?.analysis));
    const previewSrc = location.state?.previewSrc || "";
    const sourceType = location.state?.sourceType || "";
    const sourceUrl = location.state?.sourceUrl || "";
    const videoId = location.state?.videoId || "";
    const displayTitle = location.state?.displayTitle || analysisData.filename || "분석 영상";
    const isPro = false;

    const isAiGenerated = analysisData.final_prediction === "FAKE";
    const trustScore = analysisData.overall_confidence_percent.toFixed(1);

    const [showFrameGraph, setShowFrameGraph] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [forensicOpinion, setForensicOpinion] = useState("");
    const [pdfHeatmapFrames, setPdfHeatmapFrames] = useState([]);
    const [pdfComparisonNotes, setPdfComparisonNotes] = useState([]);
    const [hoveredInlineFrame, setHoveredInlineFrame] = useState(null);
    const inlineTooltipSize = { width: 240, height: 236 };

    // ── PDF 로딩 상태 ──────────────────────────────────────────
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [pdfProgress, setPdfProgress] = useState(0);

    const menuRef = useRef(null);
    const reportRef = useRef(null);
    const inlineChartRef = useRef(null);
    const inlineChartInst = useRef(null);
    const reportCaptureRef = useRef(null);

    const inlineFrameStats = useMemo(() => {
        const probs = analysisData.timeline_chart.map((f) => f.fake_prob);
        const avg = Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 10) / 10;
        const peak = Math.max(...probs);
        const peakIdx = probs.findIndex((p) => p === peak) + 1;
        const dangerCount = probs.filter((p) => p >= 70).length;
        return { avg, peak, peakIdx, dangerCount };
    }, [analysisData.timeline_chart]);

    const displayHeatmapFrames = useMemo(
        () => normalizeHeatmapFrames(analysisData),
        [analysisData]
    );

    const reportDate = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }, []);

    // 파일명 (로딩 오버레이에 표시)
    const pdfFileName = `${sanitizePdfFileName(displayTitle || analysisData.filename)}_${reportDate.replace(/[.: ]/g, "_")}.pdf`;
    const pdfAnalysisData = useMemo(
        () => ({
            ...analysisData,
            filename: displayTitle || analysisData.filename,
            sourceType,
            sourceUrl,
            videoId,
        }),
        [analysisData, displayTitle, sourceType, sourceUrl, videoId]
    );

    useEffect(() => {
        setAnalysisData(normalizeAnalysisData(location.state?.analysis));
    }, [location.state]);

    useEffect(() => {
        const startedAt = Number(location.state?.analysisStartedAt ?? 0);
        if (!startedAt) return undefined;

        let cancelled = false;
        const frameId = window.requestAnimationFrame(() => {
            if (cancelled) return;

            const elapsedSeconds = (performance.now() - startedAt) / 1000;
            setAnalysisData((current) => ({
                ...current,
                analysis_time: `${elapsedSeconds.toFixed(1)}초`,
            }));
        });

        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frameId);
        };
    }, [location.state, analysisData.analysis_id]);

    useEffect(() => {
        setForensicOpinion("");
    }, [analysisData.analysis_id]);

    useEffect(() => () => {
        pdfHeatmapFrames.forEach((frame) => {
            if (frame?.image?.startsWith?.("blob:")) {
                URL.revokeObjectURL(frame.image);
            }
        });
    }, [pdfHeatmapFrames]);

    useEffect(() => {
        const h = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    useEffect(() => {
        const init = () => {
            if (!inlineChartRef.current || !window.Chart) return;
            if (inlineChartInst.current) inlineChartInst.current.destroy();

            const ctx = inlineChartRef.current.getContext("2d");
            const scores = analysisData.timeline_chart.map((f) => f.fake_prob);
            const labels = analysisData.timeline_chart.map((f) => `Frame ${f.frame_idx}`);
            const pointColors = scores.map(pointColorFromProb);

            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, "rgba(55,138,221,0.20)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");

            inlineChartInst.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
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
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: false,
                            external: ({ tooltip }) => {
                                if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
                                    setHoveredInlineFrame(null);
                                    return;
                                }

                                const point = tooltip.dataPoints[0];
                                const frame = analysisData.timeline_chart[point.dataIndex];
                                const heatmapFrame = displayHeatmapFrames.find(
                                    (item) => item.frame_idx === frame?.frame_idx
                                );

                                setHoveredInlineFrame({
                                    ...buildChartTooltipFrame(frame, heatmapFrame),
                                    x: tooltip.caretX,
                                    y: tooltip.caretY,
                                });
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 11 }, color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                            grid: { display: false },
                        },
                        y: {
                            min: 0, max: 100,
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
        return () => { if (inlineChartInst.current) inlineChartInst.current.destroy(); };
    }, [analysisData.timeline_chart, displayHeatmapFrames]);

    // ── PDF 다운로드 (로딩 오버레이 포함) ─────────────────────
    const onDownloadPdf = async () => {
        setIsPdfLoading(true);
        setPdfProgress(0);

        const simId = simulatePdfProgress(setPdfProgress, 9000);

        try {
            const reportPayload = buildReportPayload(analysisData);
            try {
                const reportResponse = await fetchAnalyzeReport(reportPayload);
                const nextForensicOpinion = reportResponse?.forensic_opinion || "";
                const nextPdfHeatmaps = await Promise.all(
                    displayHeatmapFrames.map(async (frame) => {
                        if (!frame?.image) return frame;
                        try {
                            const fetchedImage = await fetchNgrokImage(frame.image);
                            return { ...frame, image: fetchedImage, sourceImage: frame.image };
                        } catch (imageError) {
                            console.error(imageError);
                            return frame;
                        }
                    })
                );
                flushSync(() => {
                    setForensicOpinion(nextForensicOpinion);
                    setPdfComparisonNotes(
                        buildPdfComparisonNotes(analysisData, displayTitle, reportPayload, nextForensicOpinion)
                    );
                    setPdfHeatmapFrames(nextPdfHeatmaps);
                });
            } catch (reportError) {
                console.error(reportError);
                flushSync(() => {
                    setForensicOpinion("");
                    setPdfComparisonNotes(
                        buildPdfComparisonNotes(analysisData, displayTitle, reportPayload, "")
                    );
                    setPdfHeatmapFrames(displayHeatmapFrames);
                });
            }

            const target = reportCaptureRef.current;
            if (!target) {
                alert("리포트 영역을 찾을 수 없습니다.");
                return;
            }

            await document.fonts.ready;
            await waitForImagesToLoad(target);

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
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    windowWidth: 794,
                });

                const imgData = canvas.toDataURL("image/png");
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
            }

            pdf.save(pdfFileName);

            // 완료 → 100% 표시 후 짧게 유지
            clearInterval(simId);
            setPdfProgress(100);
            await new Promise((r) => setTimeout(r, 600));

        } catch (error) {
            console.error(error);
            alert("PDF 생성 중 오류가 발생했습니다.");
        } finally {
            clearInterval(simId);
            setIsPdfLoading(false);
            setPdfProgress(0);
        }
    };

    if (showFrameGraph) {
        return (
            <FrameGraphPage
                onBack={() => setShowFrameGraph(false)}
                analysisData={analysisData}
            />
        );
    }

    const publicItems = analysisData.detailed_analysis.filter((d) => !d.proOnly);
    const proItems = analysisData.detailed_analysis.filter((d) => d.proOnly);

    return (
        <div id="main">
            {/* ── PDF 로딩 오버레이 ── */}
            <LoadingOverlay
                open={isPdfLoading}
                mode="pdf"
                pdfProgress={pdfProgress}
                pdfFileName={pdfFileName}
            />

            <style>{`
                .verdict-banner {
                    display:flex; align-items:center; gap:14px;
                    border-radius:14px; padding:18px 22px; margin-top:18px;
                    font-family:inherit; position:relative; overflow:hidden;
                    animation:verdictIn .5s cubic-bezier(.22,1,.36,1) both;
                }
                @keyframes verdictIn {
                    from { opacity:0; transform:translateY(8px) scale(.98) }
                    to { opacity:1; transform:none }
                }
                .verdict-banner.danger {
                    background:linear-gradient(135deg,#fff1f1,#ffe4e4);
                    border:1.5px solid #f87171;
                    box-shadow:0 4px 18px rgba(239,68,68,.12);
                }
                .verdict-banner.safe {
                    background:linear-gradient(135deg,#f0fdf4,#dcfce7);
                    border:1.5px solid #4ade80;
                    box-shadow:0 4px 18px rgba(74,222,128,.12);
                }
                .verdict-icon {
                    flex-shrink:0; width:44px; height:44px; border-radius:50%;
                    display:flex; align-items:center; justify-content:center; font-size:22px;
                }
                .verdict-banner.danger .verdict-icon { background:#fee2e2; }
                .verdict-banner.safe .verdict-icon { background:#bbf7d0; }
                .verdict-text { flex:1; }
                .verdict-title { font-size:15px; font-weight:700; line-height:1.3; margin-bottom:3px; }
                .verdict-banner.danger .verdict-title { color:#b91c1c; }
                .verdict-banner.safe .verdict-title { color:#15803d; }
                .verdict-desc { font-size:12px; line-height:1.5; color:#6b7280; }
                .verdict-pill { flex-shrink:0; padding:6px 13px; border-radius:999px; font-size:13px; font-weight:700; }
                .verdict-banner.danger .verdict-pill { background:#fecaca; color:#991b1b; }
                .verdict-banner.safe .verdict-pill { background:#bbf7d0; color:#166534; }
                .verdict-banner::before {
                    content:""; position:absolute; left:0; top:0; bottom:0;
                    width:5px; border-radius:14px 0 0 14px;
                }
                .verdict-banner.danger::before { background:#ef4444; }
                .verdict-banner.safe::before { background:#22c55e; }

                .rt-header-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
                .btn-deep-analysis {
                    padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700;
                    border:2px solid #2563eb; background:#fff; color:#2563eb;
                    cursor:pointer; transition:all .15s;
                }
                .btn-deep-analysis:hover { background:#eff6ff; }
                .btn-pdf {
                    padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700;
                    border:none; background:#2563eb; color:#fff;
                    cursor:pointer; transition:background .15s, opacity .15s;
                }
                .btn-pdf:hover:not(:disabled) { background:#1d4ed8; }
                .btn-pdf:disabled { opacity:0.55; cursor:not-allowed; }
                .btn-back {
                    padding:9px 16px; border-radius:8px; font-size:13px; font-weight:500;
                    border:1.5px solid #e5e7eb; background:#fff; color:#374151;
                    cursor:pointer; transition:all .15s;
                }
                .btn-back:hover { background:#f3f4f6; }

                .hamburger-wrap { position:relative; }
                .hamburger-btn {
                    width:40px; height:40px; border-radius:8px; border:1.5px solid #e5e7eb;
                    background:#fff; display:flex; flex-direction:column; align-items:center;
                    justify-content:center; gap:5px; cursor:pointer; transition:all .15s; padding:0;
                }
                .hamburger-btn:hover { background:#f3f4f6; border-color:#d1d5db; }
                .hamburger-btn span {
                    display:block; width:18px; height:2px;
                    background:#374151; border-radius:2px; transition:all .2s;
                }
                .hamburger-btn.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
                .hamburger-btn.open span:nth-child(2) { opacity:0; }
                .hamburger-btn.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
                .hamburger-dropdown {
                    position:absolute; right:0; top:calc(100% + 8px); background:#fff;
                    border:1px solid #e5e7eb; border-radius:12px;
                    box-shadow:0 8px 32px rgba(0,0,0,.12); min-width:230px;
                    z-index:100; overflow:hidden;
                    animation:dropIn .18s cubic-bezier(.22,1,.36,1) both;
                }
                @keyframes dropIn {
                    from { opacity:0; transform:translateY(-6px) scale(.97) }
                    to { opacity:1; transform:none }
                }
                .hamburger-dropdown-header {
                    padding:12px 16px 8px; font-size:11px; font-weight:700;
                    color:#9ca3af; text-transform:uppercase; letter-spacing:.06em;
                    border-bottom:1px solid #f3f4f6;
                }
                .menu-item {
                    display:flex; align-items:center; gap:10px; padding:12px 16px;
                    font-size:13px; font-weight:500; color:#374151;
                    cursor:pointer; transition:background .1s;
                }
                .menu-item:hover { background:#f9fafb; }
                .menu-icon {
                    width:30px; height:30px; border-radius:8px; background:#eff6ff;
                    display:flex; align-items:center; justify-content:center;
                    font-size:14px; flex-shrink:0;
                }
                .menu-label-blue { font-size:13px; font-weight:600; color:#1d4ed8; }
                .menu-label-gray { font-size:13px; font-weight:600; color:#374151; }
                .menu-sub { font-size:11px; color:#9ca3af; margin-top:1px; }
                .menu-divider { height:1px; background:#f3f4f6; margin:0 16px; }

                .pro-items-wrapper { position:relative; border-radius:12px; overflow:hidden; margin-top:8px; }
                .pro-items-blur { filter:blur(30px) brightness(0.88); pointer-events:none; user-select:none; }
                .pro-lock-overlay {
                    position:absolute; inset:0; display:flex; flex-direction:column;
                    align-items:center; justify-content:center; gap:10px;
                    background:rgba(0,0,0,0.52); backdrop-filter:blur(2px);
                    border-radius:12px; z-index:5;
                }
                .pro-lock-icon { font-size:32px; }
                .pro-lock-title { font-size:15px; font-weight:800; color:#fff; }
                .pro-lock-desc { font-size:12px; color:#cbd5e1; text-align:center; max-width:200px; line-height:1.5; }
                .pro-lock-btn {
                    padding:10px 24px; border-radius:8px; font-size:13px; font-weight:700;
                    background:linear-gradient(135deg,#6366f1,#2563eb); color:#fff;
                    border:none; cursor:pointer; margin-top:4px; transition:opacity .15s;
                }
                .pro-lock-btn:hover { opacity:.9; }
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

                                {/* ── PDF 버튼 (로딩 중 비활성화) ── */}
                                <button
                                    type="button"
                                    className="btn-pdf"
                                    onClick={onDownloadPdf}
                                    disabled={isPdfLoading}
                                >
                                    {isPdfLoading ? "PDF 생성 중..." : "분석 리포트 PDF 다운로드"}
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
                                            <div
                                                className="menu-item"
                                                onClick={() => { setMenuOpen(false); setShowFrameGraph(true); }}
                                            >
                                                <div className="menu-icon">📈</div>
                                                <div>
                                                    <div className="menu-label-blue">프레임별 위조 의심도 그래프</div>
                                                    <div className="menu-sub">타임라인 & 히트맵 보기</div>
                                                </div>
                                            </div>
                                            <div className="menu-divider" />
                                            <div
                                                className="menu-item"
                                                onClick={() => { setMenuOpen(false); navigate("/history"); }}
                                            >
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
                                <h3 title={displayTitle}>{displayTitle}</h3>
                                {/*<span className="badge warn">주의 필요</span>*/}
                            </div>
                            <div className="video-preview">
                                {videoId ? (
                                    <iframe
                                        title={displayTitle}
                                        src={`https://www.youtube.com/embed/${videoId}`}
                                        style={{ width: "100%", height: "100%", border: 0 }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : previewSrc ? (
                                    <img
                                        src={previewSrc}
                                        alt={displayTitle}
                                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
                                    />
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
                                    {(analysisData.model_names ?? []).map((name) => (
                                        <span className="chip" key={name}>{name}</span>
                                    ))}
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
                            {hoveredInlineFrame && (
                                <div
                                    {...(() => {
                                        const boundsWidth = inlineChartRef.current?.parentElement?.clientWidth ?? 900;
                                        const pos = getTooltipPosition(
                                            hoveredInlineFrame.x,
                                            hoveredInlineFrame.y,
                                            inlineTooltipSize.width,
                                            inlineTooltipSize.height,
                                            boundsWidth,
                                            220
                                        );
                                        return {
                                            style: {
                                                position: "absolute",
                                                left: pos.left,
                                                top: pos.top,
                                                width: inlineTooltipSize.width,
                                                background: "rgba(15,23,42,0.96)",
                                                color: "#fff",
                                                borderRadius: 12,
                                                overflow: "hidden",
                                                boxShadow: "0 12px 28px rgba(15,23,42,.28)",
                                                pointerEvents: "none",
                                                zIndex: 4,
                                            },
                                        };
                                    })()}
                                >
                                    {hoveredInlineFrame.image ? (
                                        <AdaptiveHeatmapImage
                                            src={hoveredInlineFrame.image}
                                            alt={`frame-${hoveredInlineFrame.frame_idx}`}
                                            minHeight={176}
                                            maxHeight={300}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: "100%",
                                                height: 176,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#1e293b",
                                                color: "#cbd5e1",
                                                fontSize: 12,
                                                fontWeight: 700,
                                            }}
                                        >
                                            히트맵 없음
                                        </div>
                                    )}
                                    <div style={{ padding: "10px 12px", display: "grid", gap: 4 }}>
                                        <div style={{ fontSize: 12, fontWeight: 800 }}>Frame {hoveredInlineFrame.frame_idx}</div>
                                        <div style={{ fontSize: 12, color: "#fca5a5" }}>위조 확률 {hoveredInlineFrame.fake_prob.toFixed(2)}%</div>
                                        <div style={{ fontSize: 12, color: "#93c5fd" }}>실제 확률 {hoveredInlineFrame.real_prob.toFixed(2)}%</div>
                                    </div>
                                </div>
                            )}
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

                    {displayHeatmapFrames.length > 0 && (
                        <div className="card section-card">
                            <HeatmapGallerySection
                                frames={displayHeatmapFrames}
                                title="AI 생성 영상 탐지 히트맵"
                                description="위조 확률이 가장 높은 상위 4개 프레임입니다. 나머지 프레임은 탭을 눌러 갤러리처럼 확인할 수 있습니다."
                            />
                        </div>
                    )}

                    {analysisData.ai_summary && (
                        <div className="card section-card">
                            <h3 className="section-title">종합 분석 요약</h3>
                            <div
                                style={{
                                    background: "#f9fafb",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 14,
                                    padding: "20px 22px",
                                    color: "#374151",
                                    fontSize: 15,
                                    lineHeight: 1.8,
                                }}
                            >
                                {renderSummaryMarkdown(analysisData.ai_summary)}
                            </div>
                        </div>
                    )}

                    <div className="pdf-area" />
                </section>
            </div>

            <div style={{ position: "fixed", left: "-100000px", top: 0, zIndex: -1, pointerEvents: "none" }}>
                <div ref={reportCaptureRef}>
                    <PrintableReport
                        analysisData={pdfAnalysisData}
                        inlineFrameStats={inlineFrameStats}
                        publicItems={publicItems}
                        reportDate={reportDate}
                        displayHeatmapFrames={pdfHeatmapFrames.length > 0 ? pdfHeatmapFrames : displayHeatmapFrames}
                        forensicOpinion={forensicOpinion}
                        comparisonNotes={pdfComparisonNotes}
                    />
                </div>
            </div>
        </div>
    );
}
