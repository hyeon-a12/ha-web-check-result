import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import { fetchGalleryMockAnalysisResult, fetchGalleryMockDetails } from "../services/api";

const GALLERY_IMAGE_BASE_URL = "https://tindery-anabelle-xerographically.ngrok-free.dev";

const TIMELINE = [57.16, 64.24, 50.4, 53.07, 66.79, 55.19, 41.95, 18.14, 7.09, 5.78, 2.43, 3.12, 4.5, 6.78, 9.21, 13.89]
    .map((fake_prob, index) => ({ frame_idx: index + 1, fake_prob }));

const HEATMAP = [
    { id: "VSLN-1", fake_prob: 99.95, real_prob: 0.05, image: null },
    { id: "VSLN-3", fake_prob: 98.95, real_prob: 1.05, image: null },
    { id: "VSLN-5", fake_prob: 96.91, real_prob: 3.09, image: null },
    { id: "VSLN-7", fake_prob: 77.51, real_prob: 22.49, image: null },
];

const FALLBACK_DETAILS = [
    { title: "프레임 전환 일관성 위험도", risk_level: "낮음", score_percent: 41, description: "프레임 전환 구간의 시공간적 비일관성을 분석했습니다.", proOnly: false },
    { title: "공간적 텍스처 및 화질 왜곡 위험도", risk_level: "낮음", score_percent: 29, description: "텍스처 이상 징후와 픽셀 왜곡 가능성을 분석했습니다.", proOnly: false },
    { title: "얼굴 경계 왜곡 위험도", risk_level: "중간", score_percent: 74, description: "헤어라인과 윤곽부 픽셀 불연속성 패턴이 감지되었습니다.", proOnly: true },
    { title: "조명 일관성 위험도", risk_level: "중간", score_percent: 68, description: "얼굴 좌우 조명 방향 불일치가 의심되는 구간이 감지되었습니다.", proOnly: true },
];

function riskTag(level) {
    if (level === "높음") return "high";
    if (level === "중간") return "mid";
    return "low";
}

function pointColor(prob) {
    if (prob >= 70) return "#E24B4A";
    if (prob >= 50) return "#EF9F27";
    return "#378ADD";
}

function toRiskLevel(tagClassName, score) {
    if (tagClassName === "high" || score >= 80) return "높음";
    if (tagClassName === "mid" || score >= 50) return "중간";
    return "낮음";
}

function buildDetails(details) {
    if (!details?.length) return FALLBACK_DETAILS;
    return details.map((detail, index) => ({
        title: detail.title,
        risk_level: toRiskLevel(detail.tag?.className, detail.score),
        score_percent: Math.round(detail.score ?? 0),
        description: detail.description || "상세 설명이 제공되지 않았습니다.",
        proOnly: index >= 2,
    }));
}

function buildMockAnalysisView(mockResult) {
    if (!mockResult) {
        return {
            timelineChart: TIMELINE,
            heatmapFrames: HEATMAP,
            detailItems: null,
            trustScore: null,
            isAiGenerated: null,
        };
    }

    return {
        timelineChart: mockResult.timeline_chart?.length ? mockResult.timeline_chart : TIMELINE,
        heatmapFrames: mockResult.decisive_frames?.length
            ? mockResult.decisive_frames.map((frame) => ({
                id: `Frame ${frame.frame_index}`,
                fake_prob: Number(frame.fake_prob ?? 0),
                real_prob: Number(frame.real_prob ?? 0),
                image: frame.image_url
                    ? frame.image_url.startsWith("http")
                        ? frame.image_url
                        : `${GALLERY_IMAGE_BASE_URL}${frame.image_url}`
                    : null,
            }))
            : HEATMAP,
        detailItems: mockResult.detailed_analysis?.length
            ? mockResult.detailed_analysis.map((item) => ({
                ...item,
                score_percent: Number(item.score_percent ?? 0),
                proOnly: false,
            }))
            : null,
        trustScore: Number(mockResult.overall_confidence_percent),
        isAiGenerated: String(mockResult.final_prediction || "").toLowerCase().includes("fake"),
    };
}

function buildPdfFileName(title) {
    const now = new Date();
    const dateText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const safeTitle = String(title || "analysis-report")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80);

    return `${safeTitle || "analysis-report"}_${dateText}.pdf`;
}

function FrameGraphPage({ analysisData, onBack }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const stats = useMemo(() => {
        const scores = analysisData.timelineChart.map((frame) => frame.fake_prob);
        const peak = Math.max(...scores);
        const peakFrame = analysisData.timelineChart[scores.indexOf(peak)];
        return {
            avg: Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10,
            peakIdx: peakFrame?.frame_idx ?? scores.indexOf(peak) + 1,
            dangerCount: scores.filter((value) => value >= 70).length,
        };
    }, [analysisData.timelineChart]);

    useEffect(() => {
        let script;
        const renderChart = () => {
            if (!chartRef.current || !window.Chart) return;
            chartInstanceRef.current?.destroy();
            const ctx = chartRef.current.getContext("2d");
            const scores = analysisData.timelineChart.map((frame) => frame.fake_prob);
            const gradient = ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, "rgba(55,138,221,0.20)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");
            chartInstanceRef.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels: analysisData.timelineChart.map((frame) => `Frame ${frame.frame_idx}`),
                    datasets: [{ data: scores, borderColor: "#378ADD", borderWidth: 2.5, pointBackgroundColor: scores.map(pointColor), pointBorderColor: scores.map(pointColor), pointRadius: 5, tension: 0.35, fill: true, backgroundColor: gradient }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } } } },
            });
        };
        if (window.Chart) renderChart();
        else {
            script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
            script.onload = renderChart;
            document.body.appendChild(script);
        }
        return () => {
            chartInstanceRef.current?.destroy();
            if (script?.parentNode) script.parentNode.removeChild(script);
        };
    }, [analysisData.timelineChart]);

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
            <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", gap: 16, alignItems: "center" }}>
                <button type="button" onClick={onBack} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}>← 결과 리포트로 돌아가기</button>
                <div style={{ fontSize: 16, fontWeight: 700 }}>프레임별 위조 의심도 분석</div>
            </div>
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, display: "grid", gap: 24 }}>
                <div className="card">
                    <h3 className="section-title">프레임별 위조 의심도 그래프</h3>
                    <p className="hint" style={{ marginTop: 0 }}>총 {analysisData.timelineChart.length}개 프레임 분석</p>
                    <div style={{ position: "relative", width: "100%", height: 280 }}><canvas ref={chartRef} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 20 }}>
                        <div className="tstat-box"><p className="tstat-label">평균 위조 확률</p><p className="tstat-value">{stats.avg}%</p></div>
                        <div className="tstat-box"><p className="tstat-label">최고 의심 프레임</p><p className="tstat-value danger">Frame {stats.peakIdx}</p></div>
                        <div className="tstat-box"><p className="tstat-label">위험 구간 수</p><p className="tstat-value danger">{stats.dangerCount}구간</p></div>
                    </div>
                </div>
                <div className="card">
                    <h3 className="section-title">히트맵 영상</h3>
                    <p className="hint" style={{ marginTop: 0 }}>위변조 의심 구간이 시각화된 히트맵 오버레이 영상입니다.</p>
                    <div style={{ minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "linear-gradient(135deg,#1e293b,#0f172a)", color: "#cbd5e1", border: "2px dashed #334155" }}>히트맵 영상 영역</div>
                </div>
            </div>
        </div>
    );
}

export default function GalleryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const reportRef = useRef(null);
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const menuRef = useRef(null);

    const [details, setDetails] = useState([]);
    const [mockAnalysis, setMockAnalysis] = useState(null);
    const [showFrameGraph, setShowFrameGraph] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const analysisView = useMemo(() => {
        const analysis = location.state?.analysis;
        const mockView = buildMockAnalysisView(mockAnalysis);
        const baseDetails = buildDetails(details);
        const mergedDetailItems = mockView.detailItems
            ? [...mockView.detailItems, ...baseDetails.filter((item) => item.proOnly)]
            : baseDetails;
        const score = Number(mockView.trustScore ?? analysis?.confidenceScore ?? 87);
        const prediction = String(analysis?.finalPrediction || "").toLowerCase();
        return {
            title: location.state?.displayTitle || analysis?.title || analysis?.filename || "분석한 영상",
            previewSrc: location.state?.previewSrc || analysis?.thumbnail || "",
            isAiGenerated:
                mockView.isAiGenerated ?? (prediction ? prediction.includes("ai") || prediction.includes("fake") : score >= 50),
            trustScore: score.toFixed(1),
            timelineChart: mockView.timelineChart,
            heatmapFrames: mockView.heatmapFrames,
            detailItems: mergedDetailItems,
            videoInfo: {
                analysisTime: analysis?.analysisTime || "14.2초",
                duration: analysis?.duration || "2분 34초",
                resolution: analysis?.resolution || "1920×1080",
                frameRate: analysis?.frameRate || "30fps",
                fileSize: analysis?.fileSize || "245MB",
            },
        };
    }, [details, location.state, mockAnalysis]);

    const publicItems = analysisView.detailItems.filter((item) => !item.proOnly);
    const proItems = analysisView.detailItems.filter((item) => item.proOnly);

    const stats = useMemo(() => {
        const scores = analysisView.timelineChart.map((frame) => frame.fake_prob);
        const peak = Math.max(...scores);
        const peakFrame = analysisView.timelineChart[scores.indexOf(peak)];
        return {
            avg: Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10,
            peakIdx: peakFrame?.frame_idx ?? scores.indexOf(peak) + 1,
            dangerCount: scores.filter((value) => value >= 70).length,
        };
    }, [analysisView.timelineChart]);

    useEffect(() => {
        let active = true;
        fetchGalleryMockDetails()
            .then((nextDetails) => {
                if (active) setDetails(nextDetails);
            })
            .catch(() => {
                if (active) setDetails([]);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        fetchGalleryMockAnalysisResult()
            .then((payload) => {
                if (active) setMockAnalysis(payload);
            })
            .catch(() => {
                if (active) setMockAnalysis(null);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    useEffect(() => {
        let script;
        const renderChart = () => {
            if (!chartRef.current || !window.Chart) return;
            chartInstanceRef.current?.destroy();
            const ctx = chartRef.current.getContext("2d");
            const scores = analysisView.timelineChart.map((frame) => frame.fake_prob);
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, "rgba(55,138,221,0.20)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");
            chartInstanceRef.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels: analysisView.timelineChart.map((frame) => `Frame ${frame.frame_idx}`),
                    datasets: [{ data: scores, borderColor: "#378ADD", borderWidth: 2.5, pointBackgroundColor: scores.map(pointColor), pointBorderColor: scores.map(pointColor), pointRadius: 5, tension: 0.35, fill: true, backgroundColor: gradient }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } } } },
            });
        };
        if (window.Chart) renderChart();
        else {
            script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
            script.onload = renderChart;
            document.body.appendChild(script);
        }
        return () => {
            chartInstanceRef.current?.destroy();
            if (script?.parentNode) script.parentNode.removeChild(script);
        };
    }, [analysisView.timelineChart]);

    const onDownloadPdf = async () => {
        if (!reportRef.current) return;
        setMenuOpen(false);

        const pdfHiddenElements = Array.from(reportRef.current.querySelectorAll("[data-pdf-hidden='true']"));
        const previousDisplayValues = pdfHiddenElements.map((element) => element.style.display);
        pdfHiddenElements.forEach((element) => {
            element.style.display = "none";
        });

        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: "#ffffff",
                windowWidth: reportRef.current.scrollWidth,
                windowHeight: reportRef.current.scrollHeight,
            });

            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const usableWidth = pageWidth - margin * 2;
            const scale = usableWidth / canvas.width;
            const usableHeightPx = (pageHeight - margin * 2) / scale;

            let renderedHeight = 0;
            let first = true;

            while (renderedHeight < canvas.height) {
                const pageCanvas = document.createElement("canvas");
                pageCanvas.width = canvas.width;
                pageCanvas.height = Math.min(usableHeightPx, canvas.height - renderedHeight);

                const pageContext = pageCanvas.getContext("2d");
                pageContext.drawImage(
                    canvas,
                    0,
                    renderedHeight,
                    canvas.width,
                    pageCanvas.height,
                    0,
                    0,
                    canvas.width,
                    pageCanvas.height
                );

                if (!first) {
                    pdf.addPage();
                }

                pdf.addImage(
                    pageCanvas.toDataURL("image/png"),
                    "PNG",
                    margin,
                    margin,
                    usableWidth,
                    pageCanvas.height * scale
                );

                renderedHeight += pageCanvas.height;
                first = false;
            }

            pdf.save(buildPdfFileName(analysisView.title));
        } finally {
            pdfHiddenElements.forEach((element, index) => {
                element.style.display = previousDisplayValues[index];
            });
        }
    };

    if (showFrameGraph) {
        return <FrameGraphPage analysisData={analysisView} onBack={() => setShowFrameGraph(false)} />;
    }

    return (
        <div id="main">
            <style>{`
                .gallery-preview-image { display:block; width:100%; height:280px; object-fit:contain; background:#0b0b0b; }
                .verdict-banner { display:flex; align-items:center; gap:14px; border-radius:14px; padding:18px 22px; margin-top:18px; position:relative; overflow:hidden; }
                .verdict-banner.danger { background:linear-gradient(135deg,#fff1f1 0%,#ffe4e4 100%); border:1.5px solid #f87171; box-shadow:0 4px 18px rgba(239,68,68,0.12); }
                .verdict-banner.safe { background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%); border:1.5px solid #4ade80; box-shadow:0 4px 18px rgba(74,222,128,0.12); }
                .verdict-banner::before { content:""; position:absolute; left:0; top:0; bottom:0; width:5px; }
                .verdict-banner.danger::before { background:#ef4444; }
                .verdict-banner.safe::before { background:#22c55e; }
                .verdict-icon { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900; }
                .verdict-banner.danger .verdict-icon { background:#fee2e2; color:#991b1b; }
                .verdict-banner.safe .verdict-icon { background:#bbf7d0; color:#166534; }
                .verdict-text { flex:1; }
                .verdict-title { font-size:15px; font-weight:700; margin-bottom:3px; }
                .verdict-desc { font-size:12px; line-height:1.5; color:#6b7280; }
                .verdict-pill { padding:6px 13px; border-radius:999px; font-size:13px; font-weight:700; }
                .verdict-banner.danger .verdict-pill { background:#fecaca; color:#991b1b; }
                .verdict-banner.safe .verdict-pill { background:#bbf7d0; color:#166534; }
                .rt-header-actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
                .btn-deep-analysis, .btn-pdf, .btn-back { height:42px; border-radius:999px; padding:0 16px; border:1px solid #d1d5db; background:#fff; font-weight:800; }
                .btn-deep-analysis { border-color:#c7d2fe; color:#334155; background:#eef2ff; }
                .btn-pdf { border-color:#bfdbfe; color:#1d4ed8; background:#eff6ff; }
                .btn-back { border-color:#e5e7eb; color:#111827; }
                .hamburger-wrap { position:relative; }
                .hamburger-btn { width:42px; height:42px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:4px; }
                .hamburger-btn span { width:16px; height:2px; background:#111827; border-radius:999px; transition:transform .2s ease, opacity .2s ease; }
                .hamburger-btn.open span:nth-child(1) { transform:translateY(6px) rotate(45deg); }
                .hamburger-btn.open span:nth-child(2) { opacity:0; }
                .hamburger-btn.open span:nth-child(3) { transform:translateY(-6px) rotate(-45deg); }
                .hamburger-dropdown { position:absolute; top:52px; right:0; width:320px; border-radius:16px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 18px 40px rgba(15,23,42,.12); padding:14px; z-index:30; }
                .menu-item { display:flex; gap:12px; padding:12px; border-radius:12px; cursor:pointer; }
                .menu-item:hover { background:#f8fafc; }
                .menu-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:#eff6ff; }
                .menu-sub { margin-top:2px; font-size:12px; color:#64748b; }
                .pro-items-wrapper { position:relative; margin-top:12px; }
                .pro-items-blur { filter:blur(4px); pointer-events:none; user-select:none; }
                .pro-lock-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:rgba(255,255,255,.72); border:1px dashed #cbd5e1; border-radius:18px; text-align:center; padding:24px; }
                .pro-lock-btn { height:42px; padding:0 18px; border-radius:999px; border:none; background:#111827; color:#fff; font-weight:800; }
                .heatmap-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px; margin-top:4px; }
                
                // .heatmap-cell { position:relative; border-radius:10px; overflow:hidden; background:#0f172a; aspect-ratio:3/4; }
                // .heatmap-cell img { width:100%; height:100%; object-fit:cover; display:block; }
                
                // .heatmap-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:4px; }
                // .heatmap-cell { position:relative; border-radius:12px; overflow:hidden; background:#0f172a; aspect-ratio:1/1; }
                
                // 여기가 4등분 히트맵
                .heatmap-grid {display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 4px;}
                .heatmap-cell {position: relative; border-radius: 10px; overflow: hidden; background: #0f172a; aspect-ratio: 3/4;}
 
                .heatmap-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1e293b,#0f172a); min-height:160px; color:#cbd5e1; }
                .heatmap-cell-id { position:absolute; top:8px; left:8px; background:#E24B4A; color:#fff; font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; }
                .heatmap-cell-footer { position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.72); padding:7px 10px; }
                .heatmap-cell-row { display:flex; justify-content:space-between; }
                .heatmap-fake-label, .heatmap-real-label { color:#9ca3af; font-size:11px; }
                .heatmap-fake-val { color:#E24B4A; font-weight:700; font-size:12px; }
                .heatmap-real-val { color:#d1d5db; font-weight:600; font-size:12px; }
                .heatmap-result-badge { display:inline-flex; align-items:center; gap:10px; background:#fff1f1; border:1.5px solid #fca5a5; border-radius:999px; padding:8px 20px 8px 8px; margin-bottom:20px; }
                .heatmap-badge-circle { width:52px; height:52px; border-radius:50%; border:3px solid #E24B4A; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fff; }
                .heatmap-badge-label { font-size:9px; color:#E24B4A; font-weight:700; }
                .heatmap-badge-count { font-size:18px; font-weight:800; color:#E24B4A; }
                @media (max-width: 768px) { .rt-header-actions { justify-content:flex-start; } .heatmap-grid { grid-template-columns:1fr; } }
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
                                <button type="button" className="btn-deep-analysis" data-pdf-hidden="true" onClick={() => alert("Pro 구독 후 이용 가능한 기능입니다.")}>🔒 심층 분석</button>
                                <button type="button" className="btn-pdf" data-pdf-hidden="true" onClick={onDownloadPdf}>분석 리포트 PDF 다운로드</button>
                                <button type="button" className="btn-back" data-pdf-hidden="true" onClick={() => navigate("/")}>메인으로 돌아가기</button>
                                <div className="hamburger-wrap" data-pdf-hidden="true" ref={menuRef}>
                                    <button type="button" className={`hamburger-btn${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen((prev) => !prev)} aria-label="결과 메뉴 열기"><span /><span /><span /></button>
                                    {menuOpen ? (
                                        <div className="hamburger-dropdown">
                                            <div className="menu-item" onClick={() => { setMenuOpen(false); setShowFrameGraph(true); }}>
                                                <div className="menu-icon">📈</div>
                                                <div><div style={{ fontWeight: 800, color: "#1d4ed8" }}>프레임별 위조 의심도 그래프</div><div className="menu-sub">타임라인과 히트맵 영상을 자세히 보기</div></div>
                                            </div>
                                            <div className="menu-item" onClick={() => { setMenuOpen(false); navigate("/history"); }}>
                                                <div className="menu-icon" style={{ background: "#f0fdf4" }}>🕑</div>
                                                <div><div style={{ fontWeight: 800 }}>분석 히스토리</div><div className="menu-sub">이전 분석 결과 보기</div></div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="result-grid">
                        <div className="card video-card">
                            <div className="card-head"><h3>{analysisView.title}</h3><span className="badge warn">주의 필요</span></div>
                            <div className="video-preview">{analysisView.previewSrc ? <img className="gallery-preview-image" src={analysisView.previewSrc} alt="분석 대상 미리보기" /> : <div className="vp-dummy">영상 미리보기</div>}</div>
                            <div className={`verdict-banner ${analysisView.isAiGenerated ? "danger" : "safe"}`}>
                                <div className="verdict-icon">{analysisView.isAiGenerated ? "⚠️" : "✅"}</div>
                                <div className="verdict-text">
                                    <div className="verdict-title">{analysisView.isAiGenerated ? "이 영상은 AI 영상입니다." : "이 영상은 AI 영상이 아닙니다."}</div>
                                    <div className="verdict-desc">{analysisView.isAiGenerated ? "AI 생성 또는 조작 가능성이 높아 위변조가 의심됩니다." : `판별 정확도 ${analysisView.trustScore}%로 정상 영상으로 판단됩니다.`}</div>
                                </div>
                                <div className="verdict-pill">{analysisView.trustScore}%</div>
                            </div>
                        </div>

                        <div className="side-col">
                            <div className="card"><h4 className="mini-title">판별 정확도</h4><div className="trust"><div className="trust-num">{analysisView.trustScore}%</div><div className="trust-sub">이 분석 결과의 신뢰도</div></div></div>
                            <div className="card">
                                <h4 className="mini-title">영상 정보</h4>
                                <ul className="info-list">
                                    <li><span>분석 시간</span><b>{analysisView.videoInfo.analysisTime}</b></li>
                                    <li><span>영상 길이</span><b>{analysisView.videoInfo.duration}</b></li>
                                    <li><span>해상도</span><b>{analysisView.videoInfo.resolution}</b></li>
                                    <li><span>프레임 레이트</span><b>{analysisView.videoInfo.frameRate}</b></li>
                                    <li><span>파일 크기</span><b>{analysisView.videoInfo.fileSize}</b></li>
                                </ul>
                            </div>
                            <div className="card"><h4 className="mini-title">사용된 모델</h4><div className="chips"><span className="chip">Vision Transformer</span><span className="chip">ResNet-50</span><span className="chip">XceptionNet</span></div></div>
                        </div>
                    </div>

                    <div className="card section-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                            <div><h3 className="section-title" style={{ marginBottom: 4 }}>프레임별 위조 의심도 그래프</h3><p className="hint" style={{ marginTop: 0 }}>총 {analysisView.timelineChart.length}개 프레임 분석</p></div>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}><em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#E24B4A", fontStyle: "normal" }} />높음 (70%+)</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}><em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#EF9F27", fontStyle: "normal" }} />중간 (50-69%)</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}><em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#378ADD", fontStyle: "normal" }} />낮음 (50% 미만)</span>
                            </div>
                        </div>
                        <div style={{ position: "relative", width: "100%", height: 220 }}><canvas ref={chartRef} /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}><p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>평균 위조 확률</p><p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{stats.avg}%</p></div>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}><p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>최고 의심 프레임</p><p style={{ fontSize: 20, fontWeight: 600, color: "#E24B4A", margin: 0 }}>Frame {stats.peakIdx}</p></div>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}><p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>위험 구간 수</p><p style={{ fontSize: 20, fontWeight: 600, color: "#E24B4A", margin: 0 }}>{stats.dangerCount}구간</p></div>
                        </div>
                    </div>

                    <div className="card section-card">
                        <h3 className="section-title">상세 분석 결과</h3>
                        {publicItems.map((item, index) => (
                            <div className="detail-item" key={`public-${index}`}>
                                <div className="d-left"><div className="d-title">{item.title} <span className={`tag ${riskTag(item.risk_level)}`}>위험도: {item.risk_level}</span></div><div className="d-desc">{item.description}</div></div>
                                <div className="d-right"><div className="d-percent">{item.score_percent}%</div><div className="d-sub">신뢰도</div></div>
                                <div className={`d-bar ${riskTag(item.risk_level)}`}><span style={{ width: `${item.score_percent}%` }} /></div>
                            </div>
                        ))}
                        {proItems.length ? (
                            <div className="pro-items-wrapper">
                                <div className="pro-items-blur">
                                    {proItems.map((item, index) => (
                                        <div className="detail-item" key={`pro-${index}`}>
                                            <div className="d-left"><div className="d-title">{item.title} <span className={`tag ${riskTag(item.risk_level)}`}>위험도: {item.risk_level}</span></div><div className="d-desc">{item.description}</div></div>
                                            <div className="d-right"><div className="d-percent">{item.score_percent}%</div><div className="d-sub">신뢰도</div></div>
                                            <div className={`d-bar ${riskTag(item.risk_level)}`}><span style={{ width: `${item.score_percent}%` }} /></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pro-lock-overlay">
                                    <div style={{ fontSize: 28 }}>🔒</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>Pro 전용 분석 항목</div>
                                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "#475569" }}>얼굴 경계 왜곡, 조명 일관성, 텍스처 분석 결과는<br />Pro 구독 후 확인 가능합니다.</div>
                                    <button type="button" className="pro-lock-btn" onClick={() => alert("Pro 업그레이드 페이지로 이동합니다.")}>Pro 구독하기</button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="card section-card">
                        <h3 className="section-title">AI 생성 영상 탐지 히트맵</h3>
                        <p className="hint" style={{ marginTop: 0, marginBottom: 16 }}>AI가 생성 또는 조작 의심 영역을 열화상 오버레이로 시각화한 프레임입니다.</p>
                        <div className="heatmap-result-badge">
                            <div className="heatmap-badge-circle"><span className="heatmap-badge-label">결과</span><span className="heatmap-badge-count">{analysisView.heatmapFrames.filter((frame) => frame.fake_prob >= 50).length}<span style={{ fontSize: 14, fontWeight: 600 }}>/{analysisView.heatmapFrames.length}</span></span></div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>AI 생성 영상 탐지 결과</span>
                        </div>
                        <div className="heatmap-grid">
                            {analysisView.heatmapFrames.map((frame) => (
                                <div className="heatmap-cell" key={frame.id}>
                                    {frame.image ? <img className="heatmap-image" src={frame.image} alt={frame.id} /> : <div className="heatmap-placeholder">히트맵 이미지</div>}
                                    <div className="heatmap-cell-id">{frame.id}</div>
                                    <div className="heatmap-cell-footer">
                                        <div className="heatmap-cell-row"><span className="heatmap-fake-label">AI 생성</span><span className="heatmap-fake-val">{frame.fake_prob.toFixed(2)}%</span></div>
                                        <div className="heatmap-cell-row"><span className="heatmap-real-label">실제 영상</span><span className="heatmap-real-val">{frame.real_prob.toFixed(2)}%</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
