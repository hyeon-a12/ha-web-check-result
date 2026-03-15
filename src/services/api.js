/**
 * 백엔드 API 및 mock 데이터 호출 공통 모듈
 */

// --- URL 유틸 ---

const normalizeBaseUrl = (base) => {
    if (!base) return "";
    return base.endsWith("/") ? base.slice(0, -1) : base;
};

const resolveBaseUrl = () => {
    const envBase = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
    if (envBase) return envBase;
    if (typeof window !== "undefined" && window.location?.origin) {
        return normalizeBaseUrl(window.location.origin);
    }
    return "";
};

const API_BASE_URL = resolveBaseUrl();
const ANALYZE_API_BASE_URL = normalizeBaseUrl(process.env.REACT_APP_ANALYZE_API_BASE_URL);
const MOCK_YOUTUBE_INFO_URL = "/ha_backend_mock/youtube-info.json";

const buildUrl = (path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

// --- 응답 처리 ---

const parseJson = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const request = async (path, options = {}) => {
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

// --- Mock 데이터 ---

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
            title: "프레임 전환 일관성",
            score: temporalConsistency?.flicker_score ?? 0,
            description: temporalConsistency?.description || "",
        },
        {
            key: "edge_consistency",
            title: "얼굴 경계선 분석",
            score: visualAnomalies?.edge_consistency?.score ?? 0,
            description: visualAnomalies?.edge_consistency?.description || "",
        },
        {
            key: "skin_texture_reasoning",
            title: "피부 표면 이상 징후",
            score: visualAnomalies?.skin_texture?.score ?? 0,
            description: visualAnomalies?.skin_texture?.description || "",
        },
    ];

    return orderedDetails.map((item) => ({
        ...item,
        tag: getDetailTag(item.score),
    }));
};

// --- 공개 API ---

export const fetchYoutubeInfo = async (url) => {
    const trimmed = url?.trim();
    if (!trimmed) {
        throw new Error("URL을 입력해주세요.");
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

export const checkApiKey = async () => {
    const payload = await request("/test-key", { method: "GET" });
    return payload?.message;
};

//======================================
// 링크 분석
export const analyzeVideoLink = async (videoUrl) => {
    const trimmed = videoUrl?.trim();
    if (!trimmed) {
        throw new Error("URL을 입력해주세요.");
    }

    if (!ANALYZE_API_BASE_URL) {
        throw new Error("REACT_APP_ANALYZE_API_BASE_URL 이 설정되지 않았습니다.");
    }

    const response = await fetch(`${ANALYZE_API_BASE_URL}/analyze/link`, {
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
        finalPrediction: payload?.final_prediction || "",
        confidenceScore: Number(payload?.overall_confidence_percent ?? 0),
    };
};

//======================================
// 파일 분석
export const analyzeVideoFile = async (fileObject) => {
    if (!fileObject) {
        throw new Error("파일을 선택해주세요.");
    }

    if (!ANALYZE_API_BASE_URL) {
        throw new Error("REACT_APP_ANALYZE_API_BASE_URL 이 설정되지 않았습니다.");
    }

    const formData = new FormData();
    formData.append("file", fileObject);

    const response = await fetch(`${ANALYZE_API_BASE_URL}/analyze/file`, {
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
        finalPrediction: payload?.final_prediction || "",
        confidenceScore: Number(payload?.overall_confidence_percent ?? 0),
    };
};
