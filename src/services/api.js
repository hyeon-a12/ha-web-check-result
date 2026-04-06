/**
 * 백엔드 API 및 mock 데이터 요청 공통 모듈
 */

const normalizeBaseUrl = (base) => {
    if (!base) return "";
    return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getLocationOrigin = () => (
    typeof window !== "undefined" && window.location?.origin
        ? normalizeBaseUrl(window.location.origin)
        : ""
);

const isLocalhostOrigin = (origin) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
const isLocalRuntime = () => isLocalhostOrigin(getLocationOrigin());

const resolveBaseUrl = () => {
    const envBase = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
    if (envBase) return envBase;
    if (!isLocalRuntime()) return "/api";
    return "";
};

const API_BASE_URL = resolveBaseUrl();
//분석 api
const ANALYZE_API_BASE_URL = normalizeBaseUrl(
    process.env.REACT_APP_ANALYZE_API_BASE_URL || (!isLocalRuntime() ? "/api" : "")
);
const ANALYZE_LINK_URL = normalizeBaseUrl(process.env.REACT_APP_ANALYZE_LINK_URL);
const ANALYZE_FILE_URL = normalizeBaseUrl(process.env.REACT_APP_ANALYZE_FILE_URL);
const GALLERY_IMAGE_BASE_URL = normalizeBaseUrl(
    process.env.REACT_APP_GALLERY_IMAGE_BASE_URL ||
    process.env.REACT_APP_ANALYZE_API_BASE_URL ||
    (!isLocalRuntime() ? "/api" : "")
);
const MOCK_YOUTUBE_INFO_URL = "/ha_backend_mock/youtube-info.json";
const MOCK_GALLERY_ANALYSIS_RESULT_URL = "/ha_backend_mock/gallery-analysis-result.json";

const buildUrl = (path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const assertConfiguredApiBaseUrl = () => {
    if (API_BASE_URL) return;

    throw new Error(
        "API base URL is not configured. In local development, set REACT_APP_API_BASE_URL to your backend origin."
    );
};

const buildAnalyzeUrl = (kind) => {
    if (kind === "link" && ANALYZE_LINK_URL) return ANALYZE_LINK_URL;
    if (kind === "file" && ANALYZE_FILE_URL) return ANALYZE_FILE_URL;
    if (!ANALYZE_API_BASE_URL) return "";
    return `${ANALYZE_API_BASE_URL}/analyze/${kind}`;
};

export const resolveGalleryImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("data:") || path.startsWith("blob:")) {
        return path;
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return GALLERY_IMAGE_BASE_URL ? `${GALLERY_IMAGE_BASE_URL}${normalizedPath}` : normalizedPath;
};

const parseJson = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const request = async (path, options = {}) => {
    assertConfiguredApiBaseUrl();
    const response = await fetch(buildUrl(path), options);
    const payload = await parseJson(response);

    if (!response.ok) {
        const message = payload?.message || `요청이 실패했습니다. (HTTP ${response.status})`;
        throw new Error(message);
    }

    if (payload && payload.success === false) {
        throw new Error(payload.message || "요청을 처리하지 못했습니다.");
    }

    return payload;
};

const fetchMockPayload = async () => {
    const response = await fetch(MOCK_YOUTUBE_INFO_URL);
    const payload = await parseJson(response);

    if (!response.ok || !payload) {
        throw new Error("Mock JSON을 불러오지 못했습니다.");
    }

    return payload;
};

const getDetailTag = (score) => {
    if (score >= 80) return { className: "high", label: "위험도 높음" };
    if (score >= 50) return { className: "mid", label: "위험도 중간" };
    return { className: "low", label: "위험도 낮음" };
};

const buildGalleryDetails = (payload) => {
    const visualAnomalies = payload?.reasoning?.visual_anomalies || {};
    const temporalConsistency = payload?.reasoning?.temporal_consistency;

    const orderedDetails = [
        {
            key: "eye_blinking",
            title: "눈 깜빡임 패턴",
            score: visualAnomalies?.eye_blinking?.score ?? 0,
            description: visualAnomalies?.eye_blinking?.description || "",
        },
        {
            key: "temporal_consistency",
            title: "프레임 간 일관성",
            score: temporalConsistency?.flicker_score ?? 0,
            description: temporalConsistency?.description || "",
        },
        {
            key: "edge_consistency",
            title: "경계선 분석",
            score: visualAnomalies?.edge_consistency?.score ?? 0,
            description: visualAnomalies?.edge_consistency?.description || "",
        },
        {
            key: "skin_texture_reasoning",
            title: "피부 질감 이상 징후",
            score: visualAnomalies?.skin_texture?.score ?? 0,
            description: visualAnomalies?.skin_texture?.description || "",
        },
    ];

    return orderedDetails.map((item) => ({
        ...item,
        tag: getDetailTag(item.score),
    }));
};

export const fetchYoutubeInfo = async (url) => {
    const trimmed = url?.trim();
    if (!trimmed) {
        throw new Error("URL을 입력해 주세요.");
    }

    const payload = await request("/youtube/info", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmed }),
    });

    if (!payload?.data) {
        throw new Error("유효한 데이터를 받지 못했습니다.");
    }

    return {
        videoId: payload.data.videoId || "",
        title: payload.data.title || trimmed,
        thumbnail: payload.data.thumbnail || "",
        duration: payload.data.duration || "",
    };
};

export const fetchGalleryMockDetails = async () => {
    const payload = await fetchMockPayload();
    return buildGalleryDetails(payload);
};

export const fetchGalleryMockAnalysisResult = async () => {
    const response = await fetch(MOCK_GALLERY_ANALYSIS_RESULT_URL);
    const payload = await parseJson(response);

    if (!response.ok || !payload) {
        throw new Error("Gallery mock JSON을 불러오지 못했습니다.");
    }

    return payload;
};

export const fetchNgrokImage = async (imageUrl) => {
    if (!imageUrl) return "";

    const fullUrl = resolveGalleryImageUrl(imageUrl);
    const response = await fetch(fullUrl);

    if (!response.ok) {
        throw new Error(`이미지 로드 실패 (HTTP ${response.status})`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const checkApiKey = async () => {
    const payload = await request("/test-key", { method: "GET" });
    return payload?.message;
};

const normalizeFrameImages = (frames) => (
    Array.isArray(frames)
        ? frames.map((frame) => ({
            ...frame,
            image_url: resolveGalleryImageUrl(frame.image_url || ""),
        }))
        : []
);


//url 분석
export const analyzeVideoLink = async (videoUrl) => {
    const trimmed = videoUrl?.trim();
    if (!trimmed) {
        throw new Error("URL을 입력해 주세요.");
    }

    const analyzeLinkUrl = buildAnalyzeUrl("link");
    if (!analyzeLinkUrl) {
        throw new Error("분석 API URL이 설정되지 않았습니다.");
    }

    const response = await fetch(analyzeLinkUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmed }),
    });

    const payload = await parseJson(response);

    if (!response.ok) {
        const message =
            payload?.detail || payload?.message || `분석 요청이 실패했습니다. (HTTP ${response.status})`;
        throw new Error(message);
    }

    return {
        analysisId: payload?.analysis_id || "",
        filename: payload?.filename || "",
        finalPrediction: payload?.final_prediction || "",
        confidenceScore: Number(payload?.overall_confidence_percent ?? 0),
        processTimeSeconds: Number(payload?.process_time_seconds ?? 0),
        timeline_chart: Array.isArray(payload?.timeline_chart) ? payload.timeline_chart : [],
        detailed_analysis: Array.isArray(payload?.detailed_analysis) ? payload.detailed_analysis : [],
        decisive_frames: normalizeFrameImages(payload?.decisive_frames),
        other_frames: normalizeFrameImages(payload?.other_frames),
    };
};

//비디오 분석
export const analyzeVideoFile = async (fileObject) => {
    if (!fileObject) {
        throw new Error("파일을 선택해 주세요.");
    }

    const analyzeFileUrl = buildAnalyzeUrl("file");
    if (!analyzeFileUrl) {
        throw new Error("분석 API URL이 설정되지 않았습니다.");
    }

    const formData = new FormData();
    formData.append("file", fileObject);

    const response = await fetch(analyzeFileUrl, {
        method: "POST",
        body: formData,
    });

    const payload = await parseJson(response);

    if (!response.ok) {
        const message =
            payload?.detail || payload?.message || `분석 요청이 실패했습니다. (HTTP ${response.status})`;
        throw new Error(message);
    }

    return {
        analysisId: payload?.analysis_id || "",
        filename: payload?.filename || fileObject?.name || "",
        finalPrediction: payload?.final_prediction || "",
        confidenceScore: Number(payload?.overall_confidence_percent ?? 0),
        processTimeSeconds: Number(payload?.process_time_seconds ?? 0),
        timeline_chart: Array.isArray(payload?.timeline_chart) ? payload.timeline_chart : [],
        detailed_analysis: Array.isArray(payload?.detailed_analysis) ? payload.detailed_analysis : [],
        decisive_frames: normalizeFrameImages(payload?.decisive_frames),
        other_frames: normalizeFrameImages(payload?.other_frames),
    };
};

export const fetchAnalyzeReport = async (reportPayload) => {
    const analyzeReportUrl = buildAnalyzeUrl("report");
    if (!analyzeReportUrl) {
        throw new Error("PDF report API URL is not configured.");
    }

    const response = await fetch(analyzeReportUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(reportPayload),
    });

    const payload = await parseJson(response);

    if (!response.ok) {
        const detail = payload?.detail;
        const detailMessage = Array.isArray(detail)
            ? detail.map((item) => item?.msg).filter(Boolean).join(", ")
            : detail;
        const message =
            detailMessage || payload?.message || `PDF report request failed. (HTTP ${response.status})`;
        throw new Error(message);
    }

    return payload || {};
};
