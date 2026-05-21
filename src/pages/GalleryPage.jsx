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
    analysis_id: "ANL_EFF_1779280811",
    model_used: "EfficientNet-B0 + ScoreCAM",
    filename: "link_video.mp4",
    final_prediction: "FAKE",
    overall_confidence_percent: 99.15,
    process_time_seconds: 28.13,
    analysis_time: "28.1초",
    video_duration: "2분 34초",
    resolution: "1920×1080",
    frame_rate: "30fps",
    file_size: "245MB",
    model_names: ["EfficientNet-B0 + ScoreCAM"],
    timeline_chart: [
        { sample_no: 1, frame_idx: 0, fake_prob: 80.42, risk: "높음", color: "red" },
        { sample_no: 2, frame_idx: 10, fake_prob: 91.69, risk: "높음", color: "red" },
        { sample_no: 3, frame_idx: 20, fake_prob: 94.85, risk: "높음", color: "red" },
        { sample_no: 4, frame_idx: 31, fake_prob: 97.21, risk: "높음", color: "red" },
        { sample_no: 5, frame_idx: 41, fake_prob: 98.14, risk: "높음", color: "red" },
        { sample_no: 6, frame_idx: 52, fake_prob: 98.39, risk: "높음", color: "red" },
        { sample_no: 7, frame_idx: 62, fake_prob: 98.75, risk: "높음", color: "red" },
        { sample_no: 8, frame_idx: 73, fake_prob: 99.02, risk: "높음", color: "red" },
        { sample_no: 9, frame_idx: 83, fake_prob: 99.22, risk: "높음", color: "red" },
        { sample_no: 10, frame_idx: 94, fake_prob: 99.34, risk: "높음", color: "red" },
        { sample_no: 11, frame_idx: 104, fake_prob: 99.42, risk: "높음", color: "red" },
        { sample_no: 12, frame_idx: 115, fake_prob: 99.45, risk: "높음", color: "red" },
        { sample_no: 13, frame_idx: 125, fake_prob: 99.47, risk: "높음", color: "red" },
        { sample_no: 14, frame_idx: 136, fake_prob: 99.48, risk: "높음", color: "red" },
        { sample_no: 15, frame_idx: 146, fake_prob: 99.49, risk: "높음", color: "red" },
        { sample_no: 16, frame_idx: 157, fake_prob: 99.51, risk: "높음", color: "red" },
    ],
    decisive_frames: [
        { sample_no: 7, frame_index: 62, fake_prob: 98.75, real_prob: 1.25, attention_weight_percent: 6.98, cam_intensity_percent: 12.84, image_url: "/static/ANL_EFF_1779280811_r1.jpg", detection_reasons: ["딥페이크 판별 확률 98.8%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함.", "시계열 어텐션 가중치가 상위 10% 수준(7.0%) — GRU 기반 시계열 분석 모델이 영상 전체에서 이 프레임을 핵심 판단 근거로 선택함."], rank: 1 },
        { sample_no: 8, frame_index: 73, fake_prob: 99.02, real_prob: 0.98, attention_weight_percent: 6.96, cam_intensity_percent: 15.42, image_url: "/static/ANL_EFF_1779280811_r2.jpg", detection_reasons: ["딥페이크 판별 확률 99.0%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함.", "시계열 어텐션 가중치가 상위 10% 수준(7.0%) — GRU 기반 시계열 분석 모델이 영상 전체에서 이 프레임을 핵심 판단 근거로 선택함."], rank: 2 },
        { sample_no: 9, frame_index: 83, fake_prob: 99.22, real_prob: 0.78, attention_weight_percent: 6.92, cam_intensity_percent: 13.12, image_url: "/static/ANL_EFF_1779280811_r3.jpg", detection_reasons: ["딥페이크 판별 확률 99.2%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."], rank: 3 },
        { sample_no: 10, frame_index: 94, fake_prob: 99.34, real_prob: 0.66, attention_weight_percent: 6.9, cam_intensity_percent: 11.9, image_url: "/static/ANL_EFF_1779280811_r4.jpg", detection_reasons: ["딥페이크 판별 확률 99.3%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."], rank: 4 },
    ],
    other_frames: [
        { sample_no: 1, frame_index: 0, fake_prob: 80.42, real_prob: 19.58, attention_weight_percent: 3.19, cam_intensity_percent: 12.44, image_url: "/static/ANL_EFF_1779280811_f0.jpg", detection_reasons: ["딥페이크 판별 확률 80.4%로 중위험 구간에 해당 — 단독으로는 확정적이지 않으나 다른 지표와 복합 시 유의미한 징후."] },
        { sample_no: 2, frame_index: 10, fake_prob: 91.69, real_prob: 8.31, attention_weight_percent: 4.3, cam_intensity_percent: 14.26, image_url: "/static/ANL_EFF_1779280811_f10.jpg", detection_reasons: ["딥페이크 판별 확률 91.7%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 3, frame_index: 20, fake_prob: 94.85, real_prob: 5.15, attention_weight_percent: 5.32, cam_intensity_percent: 10.34, image_url: "/static/ANL_EFF_1779280811_f20.jpg", detection_reasons: ["딥페이크 판별 확률 94.8%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 4, frame_index: 31, fake_prob: 97.21, real_prob: 2.79, attention_weight_percent: 6.11, cam_intensity_percent: 14.15, image_url: "/static/ANL_EFF_1779280811_f31.jpg", detection_reasons: ["딥페이크 판별 확률 97.2%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 5, frame_index: 41, fake_prob: 98.14, real_prob: 1.86, attention_weight_percent: 6.45, cam_intensity_percent: 12.63, image_url: "/static/ANL_EFF_1779280811_f41.jpg", detection_reasons: ["딥페이크 판별 확률 98.1%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 6, frame_index: 52, fake_prob: 98.39, real_prob: 1.61, attention_weight_percent: 6.74, cam_intensity_percent: 12.84, image_url: "/static/ANL_EFF_1779280811_f52.jpg", detection_reasons: ["딥페이크 판별 확률 98.4%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 11, frame_index: 104, fake_prob: 99.42, real_prob: 0.58, attention_weight_percent: 6.86, cam_intensity_percent: 10.45, image_url: "/static/ANL_EFF_1779280811_f104.jpg", detection_reasons: ["딥페이크 판별 확률 99.4%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 12, frame_index: 115, fake_prob: 99.45, real_prob: 0.55, attention_weight_percent: 6.73, cam_intensity_percent: 13.29, image_url: "/static/ANL_EFF_1779280811_f115.jpg", detection_reasons: ["딥페이크 판별 확률 99.4%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 13, frame_index: 125, fake_prob: 99.47, real_prob: 0.53, attention_weight_percent: 6.72, cam_intensity_percent: 13.4, image_url: "/static/ANL_EFF_1779280811_f125.jpg", detection_reasons: ["딥페이크 판별 확률 99.5%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 14, frame_index: 136, fake_prob: 99.48, real_prob: 0.52, attention_weight_percent: 6.69, cam_intensity_percent: 10.28, image_url: "/static/ANL_EFF_1779280811_f136.jpg", detection_reasons: ["딥페이크 판별 확률 99.5%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 15, frame_index: 146, fake_prob: 99.49, real_prob: 0.51, attention_weight_percent: 6.59, cam_intensity_percent: 8.83, image_url: "/static/ANL_EFF_1779280811_f146.jpg", detection_reasons: ["딥페이크 판별 확률 99.5%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
        { sample_no: 16, frame_index: 157, fake_prob: 99.51, real_prob: 0.49, attention_weight_percent: 6.54, cam_intensity_percent: 10.67, image_url: "/static/ANL_EFF_1779280811_f157.jpg", detection_reasons: ["딥페이크 판별 확률 99.5%로 고위험 기준(85%)을 초과 — 모델이 이 프레임을 위조로 분류할 강한 신호를 감지함."] },
    ],
    verdict_basis: {
        is_fake: true,
        conditions_met_count: 2,
        summary: "핵심 판정 지표인 영상 전체 FAKE 확률(99.2%)과 텍스처 왜곡 점수(97.1%)가 임계값을 초과하여 위조로 판정됩니다.",
        conditions: {
            영상_전체_FAKE_확률_초과: {
                value: 99.2,
                threshold: 85,
                met: true,
                description: "EfficientNet-B0 + GRU 모델의 영상 단위 FAKE 확률 99.2% (기준: 85%)",
            },
            텍스처_왜곡_임계값_초과: {
                value: 97.1,
                threshold: 40,
                met: true,
                description: "프레임 평균 왜곡 점수 97.1% (기준: 40%)",
            },
            시공간_비일관성_고위험: {
                value: 10.7,
                threshold: 50,
                met: false,
                description: "시공간 비일관성 점수 10.7% (기준: 50%)",
            },
        },
        caution: "본 판정은 EfficientNet-B0 기반 AI 모델의 통계적 분석 결과이며, 법적 효력을 위해서는 전문가 검토와 병행되어야 합니다.",
    },
    detailed_analysis: [
        {
            title: "시공간 비일관성 분석 (Temporal Consistency)",
            risk_level: "낮음",
            score_percent: 10.7,
            description: "프레임 전환 시 얼굴이나 배경의 미세한 떨림 및 시공간적 비일관성이 10.7% 수준으로 낮게 감지되었습니다.",
            what_this_means: "딥페이크 영상은 프레임마다 생성 품질이 달라 시간 흐름상 확률값이 불규칙하게 요동치는 경향이 있습니다. 이 지표는 그 요동의 크기와 집중 시점을 수치화한 것입니다.",
        },
        {
            title: "공간적 텍스처·화질 왜곡 분석 (Spatial Texture Distortion)",
            risk_level: "높음",
            score_percent: 97.1,
            description: "이미지 생성 과정에서 발생하는 인위적인 픽셀 뭉개짐이나 텍스처 이상 징후가 97.1% 확률로 높게 감지되었습니다.",
            what_this_means: "딥페이크 합성 과정에서 피부 텍스처, 조명 반사, 얼굴 경계선 등 공간적 세부 요소에 왜곡이 발생합니다. 이 지표는 프레임별 공간 왜곡 확률의 평균값으로 영상의 전반적인 품질 이상도를 측정합니다.",
        },
    ],
    ai_summary: "## 디지털 포렌식 전문가 소견\n\n제출된 'link_video.mp4' 영상은 딥페이크(Deepfake)로 판정되며, 분석 신뢰도는 99.15%로 매우 높습니다. EfficientNet-B0 + ScoreCAM 모델 기반의 정밀 분석 결과, 영상 전반에 걸쳐 인위적인 공간적 텍스처 및 화질 왜곡이 97.1% 수준으로 심각하게 감지되었습니다. 비록 시공간적 비일관성은 10.7%로 낮게 나타났으나, 이는 영상의 딥페이크 특성을 부인할 정도는 아닙니다.",
};

const MOCK_FORENSIC_OPINION = {
    forensic_opinion: {
        분석_개요_및_대상: "본 감정은 'ANL_EFF_1779270144' 식별자를 가진 'link_video.mp4' 파일의 진위 여부를 판별하기 위한 법영상 분석 및 디지털 포렌식 절차에 따라 수행되었습니다. 분석 결과, 해당 영상은 'FAKE'로 판정되었으며, 전체적인 신뢰도는 99.15%에 달합니다. 감정에는 AI 기반 딥페이크 탐지 모델과 조작 영역 시각화를 위한 Score-CAM 기법이 활용되었습니다.",
        주요_조작_징후_프레임별_분석: [
            { frame_rank: 1, sample_no: 7, frame_idx: 62, fake_prob: 98.75, 소견: "프레임 인덱스 62에서 분석된 첫 번째 핵심 프레임입니다. Score-CAM 히트맵은 강아지의 얼굴과 상체 부위에 걸쳐 가장 높은 활성화를 보입니다." },
            { frame_rank: 2, sample_no: 8, frame_idx: 73, fake_prob: 99.02, 소견: "프레임 인덱스 73에서 분석된 두 번째 핵심 프레임입니다. 주요 피사체의 핵심 영역에 조작이 집중되었음을 보여줍니다." },
            { frame_rank: 3, sample_no: 9, frame_idx: 83, fake_prob: 99.22, 소견: "프레임 인덱스 83에서 분석된 세 번째 핵심 프레임입니다. 얼굴과 목, 상체 전반에 걸쳐 조작 징후가 매우 강하게 나타납니다." },
            { frame_rank: 4, sample_no: 10, frame_idx: 94, fake_prob: 99.34, 소견: "프레임 인덱스 94에서 분석된 네 번째 핵심 프레임입니다. 핵심 피사체의 외형이 비정상적으로 생성 또는 변경되었음을 강력히 시사합니다." },
        ],
        텍스처_일관성_수치_분석: "제공된 Score-CAM 히트맵은 영상 내 특정 영역에서 집중적인 활성화를 나타내어 시각적 텍스처 및 미세 패턴의 불일치를 시사합니다.",
        시공간_일관성_수치_분석: "분석된 결정적 프레임 전반에 걸쳐 'FAKE' 판정 확률이 98.75%에서 99.34%로 일관되게 높게 유지되었습니다.",
        기술적_위험도_평가: {
            위험도: "높음",
            근거: "해당 영상은 전체 신뢰도 99.15%로 'FAKE' 판정을 받았으며, 분석된 모든 결정적 프레임에서 98% 이상의 매우 높은 조작 확률을 보였습니다.",
        },
        최종_감정_의견: "위 분석 결과와 종합적인 디지털 포렌식 감정에 따르면, 제출된 영상 파일 'link_video.mp4'는 인공지능 기반의 딥페이크 기술을 이용하여 조작된 것으로 판단됩니다.",
    },
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
    const rawHeatmaps =
        analysisData.heatmap_frames ??
        [
            ...(analysisData.decisive_frames ?? []),
            ...(analysisData.other_frames ?? []),
        ];

    return timeline.map((frame, idx) => {
        const matched =
            rawHeatmaps.find(
                (h) =>
                    h.frame_idx === frame.frame_idx ||
                    h.frame_index === frame.frame_idx ||
                    h.sample_no === frame.sample_no
            ) ||
            rawHeatmaps[idx] ||
            null;

        const fakeProb = matched?.fake_prob ?? frame.fake_prob ?? 0;
        const realProb = matched?.real_prob ?? Math.max(0, 100 - fakeProb);

        return {
            id: matched?.id ?? `Frame-${frame.frame_idx}`,
            frame_idx: frame.frame_idx,
            sample_no: frame.sample_no ?? matched?.sample_no,
            fake_prob: fakeProb,
            real_prob: realProb,
            attention_weight_percent: matched?.attention_weight_percent,
            cam_intensity_percent: matched?.cam_intensity_percent,
            detection_reasons: matched?.detection_reasons ?? [],
            image: matched?.image ?? matched?.image_url ?? null,
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

function normalizeAnalysisData(rawAnalysis, selectedModel = "") {
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
        model_used: rawAnalysis.model_used || rawAnalysis.modelUsed || "",
        ai_summary: rawAnalysis.ai_summary || rawAnalysis.aiSummary || "",
        final_prediction: rawAnalysis.final_prediction || rawAnalysis.finalPrediction || MOCK_ANALYSIS.final_prediction,
        overall_confidence_percent: confidence || MOCK_ANALYSIS.overall_confidence_percent,
        process_time_seconds: processTimeSeconds,
        analysis_time:
            rawAnalysis.analysis_time ||
            (processTimeSeconds > 0 ? `${processTimeSeconds.toFixed(1)}초` : MOCK_ANALYSIS.analysis_time),
        timeline_chart: timelineChart.length > 0 ? timelineChart : MOCK_ANALYSIS.timeline_chart,
        detailed_analysis: Array.isArray(rawAnalysis.detailed_analysis)
            ? rawAnalysis.detailed_analysis.map((item, i) => ({
                ...item,
                what_this_means: item.what_this_means || MOCK_ANALYSIS.detailed_analysis[i]?.what_this_means || "",
            }))
            : MOCK_ANALYSIS.detailed_analysis,
        decisive_frames: decisiveFrames,
        other_frames: otherFrames,
        heatmap_frames: heatmapFrames.length > 0
            ? heatmapFrames
            : (rawAnalysis.heatmap_frames || MOCK_ANALYSIS.heatmap_frames),
        model_names: Array.isArray(rawAnalysis.model_names) && rawAnalysis.model_names.length > 0
            ? rawAnalysis.model_names
            : rawAnalysis.model_used
                ? [rawAnalysis.model_used]
            : selectedModel
                ? [selectedModel]
            : MOCK_ANALYSIS.model_names,
        video_duration: rawAnalysis.video_duration || rawAnalysis.duration || MOCK_ANALYSIS.video_duration,
        resolution: rawAnalysis.resolution || MOCK_ANALYSIS.resolution,
        frame_rate: rawAnalysis.frame_rate || MOCK_ANALYSIS.frame_rate,
        file_size: rawAnalysis.file_size || MOCK_ANALYSIS.file_size,
        verdict_basis: rawAnalysis.verdict_basis || MOCK_ANALYSIS.verdict_basis,
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
        model_used: analysisData.model_used,
        model_names: analysisData.model_names,
        final_prediction: analysisData.final_prediction,
        overall_confidence_percent: analysisData.overall_confidence_percent,
        process_time_seconds: analysisData.process_time_seconds,
        analysis_time: analysisData.analysis_time,
        video_duration: analysisData.video_duration,
        resolution: analysisData.resolution,
        frame_rate: analysisData.frame_rate,
        file_size: analysisData.file_size,
        timeline_chart: analysisData.timeline_chart,
        detailed_analysis: analysisData.detailed_analysis,
        decisive_frames: analysisData.decisive_frames,
        other_frames: analysisData.other_frames,
        verdict_basis: analysisData.verdict_basis,
        ai_summary: analysisData.ai_summary,
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
    const hasInjectedAnalysis = Boolean(location.state?.analysis);
    const selectedModel = location.state?.selectedModel || "";
    const [analysisData, setAnalysisData] = useState(() => normalizeAnalysisData(location.state?.analysis, selectedModel));
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
    const [forensicOpinion, setForensicOpinion] = useState(() => (hasInjectedAnalysis ? "" : MOCK_FORENSIC_OPINION));
    const [pdfHeatmapFrames, setPdfHeatmapFrames] = useState([]);
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
        const timeline = analysisData.timeline_chart ?? [];
        if (timeline.length === 0) {
            return { avg: 0, peak: 0, peakIdx: "-", dangerCount: 0 };
        }

        const probs = timeline.map((f) => Number(f.fake_prob ?? 0));
        const avg = Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 10) / 10;
        const peak = Math.max(...probs);
        const peakFrame = timeline.find((frame) => Number(frame.fake_prob ?? 0) === peak);
        const peakIdx = peakFrame?.frame_idx ?? timeline[0]?.frame_idx ?? "-";
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
        setAnalysisData(normalizeAnalysisData(location.state?.analysis, location.state?.selectedModel || ""));
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
        setForensicOpinion(location.state?.analysis ? "" : MOCK_FORENSIC_OPINION);
    }, [analysisData.analysis_id, location.state]);

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
                const nextForensicOpinion = reportResponse?.forensic_opinion || reportResponse?.forensicOpinion || "";
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
                    setPdfHeatmapFrames(nextPdfHeatmaps);
                });
            } catch (reportError) {
                console.error(reportError);
                flushSync(() => {
                    setForensicOpinion("");
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

                .analysis-summary-card {
                    background:#ffffff;
                    border:1px solid #e5e7eb;
                    border-radius:18px;
                    padding:22px 24px;
                    box-shadow:0 1px 8px rgba(15,23,42,.03);
                }
                .analysis-summary-title {
                    display:flex;
                    align-items:center;
                    gap:8px;
                    margin:0 0 10px;
                    font-size:17px;
                    font-weight:800;
                    color:#111827;
                }
                .analysis-summary-desc {
                    margin:0 0 18px;
                    font-size:13px;
                    line-height:1.75;
                    color:#4b5563;
                }
                .condition-grid {
                    display:grid;
                    grid-template-columns:repeat(3, minmax(0, 1fr));
                    gap:14px;
                    margin-top:16px;
                }
                .condition-card {
                    background:#ffffff;
                    border:1px solid #e5e7eb;
                    border-radius:14px;
                    padding:18px;
                    min-height:136px;
                    box-sizing:border-box;
                }
                .condition-card.met {
                    background:#fff7f7;
                    border-color:#fecaca;
                }
                .condition-card.safe {
                    background:#eff6ff;
                    border-color:#bfdbfe;
                }
                .condition-title {
                    font-size:13px;
                    font-weight:800;
                    color:#111827;
                    margin-bottom:12px;
                    line-height:1.35;
                }
                .condition-value {
                    font-size:25px;
                    font-weight:900;
                    margin-bottom:10px;
                    letter-spacing:-0.4px;
                }
                .condition-card.met .condition-value {
                    color:#dc2626;
                }
                .condition-card.safe .condition-value {
                    color:#2563eb;
                }
                .condition-value span {
                    font-size:13px !important;
                    font-weight:700 !important;
                    color:#6b7280 !important;
                    letter-spacing:0;
                }
                .condition-desc {
                    font-size:12px;
                    line-height:1.55;
                    color:#6b7280;
                }
                .analysis-caution {
                    margin-top:16px;
                    padding:14px 16px;
                    border-radius:12px;
                    background:#fffbeb;
                    border:1px solid #fde68a;
                    color:#92400e;
                    font-size:13px;
                    line-height:1.6;
                    font-weight:600;
                }
                .what-means {
                    margin-top:10px;
                    padding:12px 14px;
                    border-radius:12px;
                    background:#eff6ff;
                    border:1px solid #bfdbfe;
                    color:#6b7280;
                    font-size:13px;
                    line-height:1.65;
                }
                .what-means b {
                    display:block;
                    margin-bottom:4px;
                    color:#111827;
                    font-size:13px;
                    font-weight:700;
                }
                @media (max-width: 900px) {
                    .condition-grid {
                        grid-template-columns:1fr;
                    }
                }
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

                    {analysisData.verdict_basis && (
                        <div className="card section-card analysis-summary-wrap">
                            <h3 className="section-title">종합 분석</h3>

                            <div className="analysis-summary-card">
                                <h4 className="analysis-summary-title">
                                    <span>📄</span> 판정 근거 요약
                                </h4>

                                <p className="analysis-summary-desc">
                                    {analysisData.verdict_basis.summary}
                                </p>

                                <div className="condition-grid">
                                    {Object.entries(analysisData.verdict_basis.conditions ?? {}).filter(([key]) => !key.includes("부분_조작")).map(([key, condition]) => (
                                        <div
                                            key={key}
                                            className={`condition-card ${condition.met ? "met" : "safe"}`}
                                        >
                                            <div className="condition-title">
                                                {key.replaceAll("_", " ")}
                                            </div>

                                            <div className="condition-value">
                                                {condition.value}%
                                                <span> / 기준 {condition.threshold}%</span>
                                            </div>

                                            <div className="condition-desc">
                                                {condition.description}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {analysisData.verdict_basis.caution && (
                                    <div className="analysis-caution">
                                        ※ {analysisData.verdict_basis.caution}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                                    {item.what_this_means && (
                                        <div className="what-means">
                                            <b>판별 근거</b>
                                            {item.what_this_means}
                                        </div>
                                    )}
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
                    />
                </div>
            </div>
        </div>
    );
}
