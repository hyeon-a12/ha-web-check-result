/**
 * 백엔드 API 및 mock 데이터 호출 공통 모듈
 */

// --- URL 유틸 ---

// base: API 서버 주소 문자열. 끝에 / 있으면 제거해서 통일 (중복 슬래시 방지)
const normalizeBaseUrl = (base) => {
    if (!base) return "";
    return base.endsWith("/") ? base.slice(0, -1) : base;
};

// 반환: 실제 요청에 쓸 베이스 URL. env에 REACT_APP_API_BASE_URL 있으면 그걸 쓰고, 없으면 현재 페이지 origin 사용
const resolveBaseUrl = () => {
    const envBase = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
    if (envBase) return envBase;
    if (typeof window !== "undefined" && window.location?.origin) {
        return normalizeBaseUrl(window.location.origin);
    }
    return "";
};

const API_BASE_URL = resolveBaseUrl(); // fetch 시 항상 이 주소 + path 로 요청
const MOCK_YOUTUBE_INFO_URL = "/ha_backend_mock/youtube-info.json"; // public 폴더 내 mock JSON 경로

// path: API 경로 (예: "/youtube/info"). 앞에 / 없어도 붙여줌. 반환: 최종 요청 URL (API_BASE_URL + path)
const buildUrl = (path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

// --- 응답 처리 ---

// response: fetch()가 반환한 Response 객체. 반환: 파싱된 JSON 객체 또는 실패 시 null
const parseJson = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

// path: API 경로. options: fetch 옵션 (method, headers, body 등).
// response: 서버 응답. payload: 응답 body를 JSON으로 파싱한 값. 4xx/5xx 이거나 payload.success === false 면 에러 throw, 아니면 payload 반환
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

// MOCK_YOUTUBE_INFO_URL 에서 JSON 로드. response/payload 로 상태·본문 확인 후, 성공 시 payload 반환
const fetchMockPayload = async () => {
    const response = await fetch(MOCK_YOUTUBE_INFO_URL);
    const payload = await parseJson(response);

    if (!response.ok || !payload) {
        throw new Error("Mock JSON을 불러오지 못했습니다.");
    }

    return payload;
};

// score: 분석 점수(숫자). 반환: { className, label } — UI에서 스타일·문구용. 80+ 높음, 50+ 중간, 그 미만 낮음
const getDetailTag = (score) => {
    if (score >= 80) return { className: "high", label: "위험도: 높음" };
    if (score >= 50) return { className: "mid", label: "위험도: 중간" };
    return { className: "low", label: "위험도: 낮음" };
};

// payload: mock JSON 전체 (reasoning.visual_anomalies, temporal_consistency 등 포함).
// visualAnomalies, temporalConsistency 에서 점수·설명 추출 → orderedDetails 배열로 고정 순서 구성 → 각 항목에 getDetailTag(score) 로 tag 붙여 반환
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
            title: "얼굴 경계 왜곡",
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

// url: 사용자가 입력한 유튜브 URL. trimmed 로 앞뒤 공백 제거 후 body에 { url: trimmed } 로 담아 POST /youtube/info 요청.
// payload.data 에서 videoId, title, thumbnail, duration 꺼내서 화면용 객체로 반환 (없는 필드는 "" 또는 trimmed 로 대체)
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
        videoId: payload.data.videoId || "", // 비디오 ID 추가
        title: payload.data.title || trimmed, // 비디오 제목 추가
        thumbnail: payload.data.thumbnail || "", // 썸네일 이미지 추가
        duration: payload.data.duration || "", // 비디오 재생 시간 추가
    };
};

// fetchMockPayload() 로 mock JSON 로드 → buildGalleryDetails(payload) 에 넘겨 갤러리용 상세 배열 받아 그대로 반환
export const fetchGalleryMockDetails = async () => {
    const payload = await fetchMockPayload();
    return buildGalleryDetails(payload);
};

// GET /test-key 호출. payload?.message 를 반환 (연결/키 확인용 메시지)
export const checkApiKey = async () => {
    const payload = await request("/test-key", { method: "GET" });
    return payload?.message;
};
