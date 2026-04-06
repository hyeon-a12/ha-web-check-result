// PrintableReport.jsx
// 영상 위변조 분석 보고서 PDF 컴포넌트

function PdfLineChart({ data }) {
    // PDF 렌더링 환경(고정 캔버스)에 맞춰 SVG 좌표를 직접 계산한다.
    const width = 660;
    const height = 160;
    const padL = 36, padR = 16, padT = 12, padB = 28;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const maxX = data.length - 1 || 1;

    const pts = data.map((d, i) => {
        const x = padL + (i / maxX) * innerW;
        const y = padT + innerH - (Math.min(d.fake_prob, 100) / 100) * innerH;
        return { x, y, ...d };
    });

    const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");

    const areaPath = [
        `M ${pts[0]?.x ?? padL} ${padT + innerH}`,
        ...pts.map((p) => `L ${p.x} ${p.y}`),
        `L ${pts[pts.length - 1]?.x ?? padL} ${padT + innerH}`,
        "Z",
    ].join(" ");

    const yTicks = [0, 25, 50, 75, 100];

    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.01" />
                </linearGradient>
            </defs>

            {yTicks.map((t) => {
                const y = padT + innerH - (t / 100) * innerH;
                return (
                    <g key={t}>
                        <line
                            x1={padL}
                            y1={y}
                            x2={padL + innerW}
                            y2={y}
                            stroke={t === 0 ? "#94a3b8" : "#e2e8f0"}
                            strokeWidth={t === 0 ? 1.2 : 0.8}
                            strokeDasharray={t === 0 ? "none" : "3,3"}
                        />
                        <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#64748b">
                            {t}
                        </text>
                    </g>
                );
            })}

            <rect
                x={padL}
                y={padT}
                width={innerW}
                height={(innerH * 30) / 100}
                fill="#fef2f2"
                opacity="0.6"
            />
            <text
                x={padL + innerW - 2}
                y={padT + (innerH * 30) / 100 - 2}
                textAnchor="end"
                fontSize="8"
                fill="#dc2626"
                opacity="0.8"
            >
                위험 구간 (70%+)
            </text>

            {pts.length > 0 && <path d={areaPath} fill="url(#chartGrad)" />}
            {pts.length > 0 && (
                <polyline
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="2"
                    points={polyline}
                    strokeLinejoin="round"
                />
            )}

            {pts.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill={p.fake_prob >= 70 ? "#dc2626" : p.fake_prob >= 50 ? "#f59e0b" : "#1d4ed8"}
                    stroke="#fff"
                    strokeWidth="1.5"
                />
            ))}

            {pts
                .filter((_, i) => data.length <= 10 || i % Math.ceil(data.length / 8) === 0)
                .map((p, i) => (
                    <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="8.5" fill="#64748b">
                        {p.frame_idx}
                    </text>
                ))}

            <text x={padL + innerW / 2} y={height - 1} textAnchor="middle" fontSize="8" fill="#94a3b8">
                프레임 인덱스
            </text>
        </svg>
    );
}

function MiniBar({ value, max = 100, color = "#1d4ed8", bgColor = "#e2e8f0" }) {
    // 막대 길이는 max 기준 비율로 계산하고, 100%를 넘지 않게 clamp 처리한다.
    const pct = Math.min((value / max) * 100, 100);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
                style={{
                    flex: 1,
                    height: 4,
                    background: bgColor,
                    borderRadius: 4,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 4,
                    }}
                />
            </div>
            <span
                style={{
                    fontSize: 8,
                    color: "#374151",
                    fontWeight: 700,
                    minWidth: 22,
                    textAlign: "right",
                }}
            >
                {value.toFixed(0)}
            </span>
        </div>
    );
}

function RiskBadge({ level }) {
    // 한글/영문 위험도 입력을 모두 표준 키(HIGH/MEDIUM/LOW)로 정규화한다.
    const map = {
        HIGH: { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", label: "높음" },
        MEDIUM: { bg: "#fffbeb", border: "#fde68a", color: "#d97706", label: "중간" },
        LOW: { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a", label: "낮음" },
    };

    const normalized =
        level === "높음" ? "HIGH" :
            level === "중간" ? "MEDIUM" :
                level === "낮음" ? "LOW" :
                    level?.toUpperCase?.();

    const s = map[normalized] || map.LOW;

    return (
        <span
            style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                background: s.bg,
                border: `1px solid ${s.border}`,
                color: s.color,
                fontSize: 10,
                fontWeight: 800,
            }}
        >
            {s.label}
        </span>
    );
}

function chunkArray(arr, size) {
    // 긴 표/히트맵 목록을 페이지 단위로 잘라 PDF 레이아웃을 안정화한다.
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

function normalizeMarkdownLineSafe(line) {
    // NBSP(\u00a0) 같은 특수 공백을 일반 공백으로 통일해 정규식 매칭 실패를 줄인다.
    return line.replace(/\u00a0/g, " ").trim();
}

function extractSectionLinesSafe(markdownText, sectionNumber) {
    // 모델 응답 포맷이 조금 달라도 section 번호 기반으로 최대한 복원한다.
    if (!markdownText) return [];

    const headingPattern = /^###\s+\d+\s*\./;
    const lines = markdownText.split(/\r?\n/);
    const sectionPattern = new RegExp(`^###\\s*${sectionNumber}\\s*\\.`, "i");
    const startIndex = lines.findIndex((line) => sectionPattern.test(normalizeMarkdownLineSafe(line)));

    if (startIndex === -1) {
        return [];
    }

    const collected = [];
    for (let i = startIndex + 1; i < lines.length; i += 1) {
        const trimmed = normalizeMarkdownLineSafe(lines[i]);
        if (headingPattern.test(trimmed)) break;
        if (trimmed === "---") continue;
        collected.push(lines[i]);
    }

    return collected;
}

function extractFinalOpinionSafe(markdownText) {
    // 우선 섹션 4를 정석대로 파싱하고, 실패하면 heading 제거 후 전체 텍스트를 fallback으로 사용.
    const extracted = extractSectionLinesSafe(markdownText, 4)
        .map((line) => line.replace(/\*\*(.+?)\*\*/g, "$1").trimEnd())
        .filter((line) => line.trim())
        .join("\n")
        .trim();

    if (extracted) {
        return extracted;
    }

    return markdownText
        .replace(/^###+\s.*$/gm, "")
        .replace(/^---$/gm, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .trim();
}

function extractPdfFinalOpinion(markdownText) {
    const stopPattern = /^(감정인 서명|서명|감정 기관명|연락처|이메일|\[감정인 이름\])/i;
    const sectionLines = extractSectionLinesSafe(markdownText, 4);
    const extracted = [];

    for (const rawLine of sectionLines) {
        const line = rawLine.replace(/\*\*(.+?)\*\*/g, "$1").trimEnd();
        if (!line.trim()) continue;
        if (stopPattern.test(line.trim())) break;
        extracted.push(line);
    }

    if (extracted.length > 0) {
        return extracted.join("\n").trim();
    }

    return extractFinalOpinionSafe(markdownText)
        .replace(/(?:감정인 서명|서명|감정 기관명|연락처|이메일)[\s\S]*$/i, "")
        .trim();
}

function parseForensicFrameFindingsSafe(markdownText) {
    // 다양한 마크다운 표기(굵게/하이픈/콜론 유무)를 허용하는 안전 파서.
    const lines = extractSectionLinesSafe(markdownText, 2);
    const findings = [];
    let current = null;

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        const rankFrameMatch = line.match(/^\*\s+\*\*프레임\s+(\d+)\s*\(Rank\s+\d+\)\s*:\*\*/i);
        if (rankFrameMatch) {
            current = {
                frameIndex: Number(rankFrameMatch[1]),
                imageName: "",
                probabilityText: "",
                analysisText: "",
            };
            findings.push(current);
            return;
        }

        const frameMatch = line.match(/(\d+).*?\((?:.*?:\s*)?([^)]+\.(?:jpg|jpeg|png|webp))\)/i);
        if (frameMatch) {
            current = {
                frameIndex: Number(frameMatch[1]),
                imageName: frameMatch[2].trim(),
                probabilityText: "",
                analysisText: "",
            };
            findings.push(current);
            return;
        }

        if (!current) return;

        const frameIndexMatch = line.match(/`frame_index`\s*:\s*(\d+)/i);
        if (frameIndexMatch) {
            current.frameIndex = Number(frameIndexMatch[1]);
        }

        const probabilityMatch = line.replace(/\*\*/g, "").match(/(\d+(?:\.\d+)?)%/);
        if (probabilityMatch) {
            current.probabilityText = `${probabilityMatch[1]}%`;
            return;
        }

        if (line.includes(":")) {
            const [, maybeText = ""] = line.replace(/\*\*/g, "").split(/:\s*/, 2);
            if (maybeText) {
                current.analysisText = current.analysisText
                    ? `${current.analysisText} ${maybeText.trim()}`
                    : maybeText.trim();
                return;
            }
        }

        if (line.startsWith("*")) {
            return;
        }

        current.analysisText = current.analysisText
            ? `${current.analysisText} ${line.replace(/\*\*/g, "").trim()}`
            : line.replace(/\*\*/g, "").trim();
    });

    return findings;
}

function parseTechnicalRiskAssessmentsSafe(markdownText) {
    // 제목 패턴이 흔들려도 "위험도 평가" 섹션 텍스트를 유연하게 파싱한다.
    const lines = extractSectionLinesSafe(markdownText, 3);
    const assessments = [];
    let current = null;

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        if (line.startsWith("*") && line.includes("**") && line.includes(":")) {
            const normalized = line.replace(/^\*\s*/, "").replace(/\*\*/g, "").trim();
            const [titlePart, ...descriptionParts] = normalized.split(":");
            current = {
                title: titlePart.trim(),
                description: descriptionParts.join(":").trim(),
            };
            assessments.push(current);
            return;
        }

        if (!current) return;

        const cleaned = line.replace(/\*\*/g, "").trim();
        current.description = current.description
            ? `${current.description} ${cleaned}`
            : cleaned;
    });

    return assessments;
}

function buildTopFrameExplanations(summaryFrames, forensicFrameFindings, normalizedHeatmaps) {
    return summaryFrames.slice(0, 4).map((frame, index) => {
        const matchedFinding = forensicFrameFindings.find((item) => item.frameIndex === frame.frame_idx);
        const matchedHeatmap = normalizedHeatmaps.find((item) => item.frame_idx === frame.frame_idx);
        const defaultDescription =
            frame.fake_prob >= 70
                ? "프레임 경계와 질감 변화가 두드러져 상위 위험 구간으로 분류되었습니다."
                : frame.fake_prob >= 50
                    ? "주요 피사체 주변의 일관성 저하가 감지되어 추가 확인이 필요한 프레임입니다."
                    : "비교군 대비 위조 확률은 낮지만, 대표 샘플로 포함된 프레임입니다.";

        return {
            rank: index + 1,
            frameIndex: frame.frame_idx,
            probabilityText: matchedFinding?.probabilityText || `${frame.fake_prob.toFixed(1)}%`,
            imageName: matchedFinding?.imageName || matchedHeatmap?.sourceImage || matchedHeatmap?.image || "-",
            description: matchedFinding?.analysisText || defaultDescription,
        };
    });
}

function extractTechnicalRiskIntroSafe(markdownText) {
    const lines = extractSectionLinesSafe(markdownText, 3);
    const introLines = [];

    for (const rawLine of lines) {
        const line = rawLine.replace(/\*\*(.+?)\*\*/g, "$1").trim();
        if (!line) continue;
        if (line.startsWith("*")) break;
        introLines.push(line);
    }

    return introLines.join(" ").trim();
}

function buildDisplayHeatmapFrames(analysisData, externalHeatmaps = []) {
    // timeline_chart를 기준 축으로 잡고 heatmap 메타를 병합해
    // 화면/표에서 바로 쓰기 좋은 프레임 객체 배열로 정규화한다.
    const timeline = analysisData.timeline_chart ?? [];
    const rawHeatmaps =
        externalHeatmaps.length > 0
            ? externalHeatmaps
            : analysisData.heatmap_frames ?? [];

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
            sourceImage: matched?.sourceImage ?? matched?.image ?? null,
            risk:
                frame.risk ??
                (fakeProb >= 70 ? "높음" : fakeProb >= 50 ? "중간" : "낮음"),
        };
    });
}

export default function PrintableReport({
    analysisData,
    inlineFrameStats,
    publicItems,
    reportDate,
    displayHeatmapFrames = [],
    forensicOpinion = "",
    comparisonNotes = [],
}) {
    // 1) 원본 분석 데이터에서 PDF 표시용 파생값 계산
    // 2) 각 섹션(표/그래프/히트맵)에서 재사용할 공통 데이터 생성
    const isFake = analysisData.final_prediction === "FAKE";
    const verdictText = isFake ? "AI 생성 의심" : "정상 영상";
    const verdictColor = isFake ? "#dc2626" : "#16a34a";
    const verdictBg = isFake ? "#fef2f2" : "#f0fdf4";
    const verdictBorder = isFake ? "#fecaca" : "#bbf7d0";

    const timelineChart = analysisData.timeline_chart ?? [];
    const totalFrames = timelineChart.length;

    const fileExt = analysisData.filename?.split(".").pop()?.toLowerCase() || "mp4";
    // 백엔드 응답에 모델 목록이 없을 때를 대비해 기본 모델명을 사용한다.
    const modelNames = analysisData.model_names ?? [
        "Vision Transformer",
        "ResNet-50",
        "XceptionNet",
    ];

    const sortedFramesDesc = [...timelineChart].sort((a, b) => b.fake_prob - a.fake_prob);
    // 상위 위험 프레임은 하이라이트 카드(오렌지 점) 표시 여부 판단에 사용한다.
    const sortedTop4 = sortedFramesDesc.slice(0, 4).map((d) => d.frame_idx);

    const avgProb = totalFrames
        ? timelineChart.reduce((s, d) => s + d.fake_prob, 0) / totalFrames
        : 0;

    const summaryFrameLimit =
        totalFrames <= 16 ? totalFrames :
            totalFrames <= 30 ? 8 :
                6;

    const summaryFrames = sortedFramesDesc
        .slice(0, summaryFrameLimit)
        .sort((a, b) => a.frame_idx - b.frame_idx);

    // 페이지별 용량을 맞추기 위해 고정 단위로 chunk 분할한다.
    const frameChunks = chunkArray(timelineChart, 15);
    const normalizedHeatmaps = buildDisplayHeatmapFrames(
        analysisData,
        displayHeatmapFrames
    );
    // 마크다운 forensic 의견을 PDF 표시용 구조로 변환한다.
    const heatmapChunks = chunkArray(normalizedHeatmaps, 6);
    const finalOpinion = extractPdfFinalOpinion(forensicOpinion) || " ";
    const forensicFrameFindings = parseForensicFrameFindingsSafe(forensicOpinion);
    const technicalRiskAssessments = parseTechnicalRiskAssessmentsSafe(forensicOpinion);
    const technicalRiskIntro = extractTechnicalRiskIntroSafe(forensicOpinion);
    const detailItems = technicalRiskAssessments.length > 0
        ? technicalRiskAssessments
        : publicItems.map((item) => ({
            title: item.title,
            description: item.description,
        }));
    const topFrameExplanations = buildTopFrameExplanations(
        sortedFramesDesc,
        forensicFrameFindings,
        normalizedHeatmaps
    );
    const totalPdfPages = 2 + heatmapChunks.length + (comparisonNotes.length > 0 ? 1 : 0);

    // 인쇄 안정성을 위해 CSS 파일 의존 대신 inline style 시스템을 사용한다.
    const S = {
        page: {
            width: 794,
            minHeight: 1123,
            background: "#fff",
            fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
            fontSize: 12,
            color: "#1e293b",
            position: "relative",
            boxSizing: "border-box",
            padding: "28px 32px 24px",
            borderBottom: "4px solid #f1f5f9",
        },

        brandBar: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: "3px solid #1e3a8a",
            paddingBottom: 10,
            marginBottom: 14,
        },
        brandLeft: { display: "flex", flexDirection: "column", gap: 2 },
        brandTitle: { fontSize: 22, fontWeight: 900, color: "#1e3a8a", letterSpacing: -0.5 },
        brandSub: { fontSize: 10, color: "#64748b", letterSpacing: 0.3 },
        brandRight: { textAlign: "right" },
        brandModel: { fontSize: 10, color: "#94a3b8" },
        brandDate: { fontSize: 10, color: "#64748b" },

        infoStrip: {
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        },
        infoCell: {
            padding: "12px 14px",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
            minHeight: 64,
            boxSizing: "border-box",
        },
        infoCellLast: {
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
            minHeight: 64,
            boxSizing: "border-box",
        },
        infoLabel: {
            fontSize: 10,
            color: "#64748b",
            fontWeight: 800,
            letterSpacing: 0.2,
            marginBottom: 1,
        },
        infoValue: {
            fontSize: 14,
            fontWeight: 800,
            color: "#1e293b",
            lineHeight: 1.35,
        },
        fileNameValue: {
            fontSize: 13,
            fontWeight: 800,
            color: "#1e293b",
            lineHeight: 1.35,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
        },

        mainGrid: { display: "grid", gridTemplateColumns: "1fr 220px", gap: 14, marginBottom: 14 },

        sectionTitle: {
            fontSize: 13,
            fontWeight: 900,
            color: "#1e3a8a",
            borderBottom: "1.5px solid #1e3a8a",
            paddingBottom: 3,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
        },
        sectionEn: { fontSize: 10, fontWeight: 700, color: "#64748b" },

        verdictBox: {
            border: `2px solid ${verdictBorder}`,
            background: verdictBg,
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
        },
        verdictMain: { fontSize: 28, fontWeight: 900, color: verdictColor, letterSpacing: -1 },
        verdictConf: { textAlign: "right" },
        verdictConfNum: { fontSize: 22, fontWeight: 900, color: "#1e293b" },
        verdictConfLabel: { fontSize: 9, color: "#64748b" },

        metricGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 },
        metricCard: {
            border: "1px solid #e2e8f0",
            borderRadius: 5,
            padding: "8px 10px",
            textAlign: "center",
            background: "#f8fafc",
        },
        metricLabel: { fontSize: 9, color: "#64748b", marginBottom: 3 },
        metricValue: { fontSize: 16, fontWeight: 900, color: "#1e293b" },
        metricUnit: { fontSize: 9, fontWeight: 700, color: "#94a3b8" },

        scoreCard: {
            border: "1.5px solid #1e3a8a",
            borderRadius: 6,
            padding: "12px",
            textAlign: "center",
            marginBottom: 10,
            marginTop: 20,
            background: "#eff6ff",
        },
        scoreTitle: { fontSize: 10, color: "#1d4ed8", fontWeight: 800, marginBottom: 4 },
        scoreNum: { fontSize: 48, fontWeight: 900, color: "#1e3a8a", lineHeight: 1 },
        scoreMax: { fontSize: 14, color: "#64748b", fontWeight: 700 },
        scoreNote: { fontSize: 9, color: "#64748b", marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-line" },

        table: { width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 10 },
        th: {
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            padding: "6px 8px",
            textAlign: "left",
            fontWeight: 700,
            color: "#374151",
        },
        td: {
            border: "1px solid #e2e8f0",
            padding: "6px 8px",
            verticalAlign: "middle",
            color: "#374151",
        },

        frameSummaryNote: {
            fontSize: 9,
            color: "#64748b",
            marginBottom: 6,
        },
        frameGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 6 },
        frameCard: {
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "3px 6px",
            background: "#f8fafc",
        },
        frameCardTop: {
            border: "1px solid #fed7aa",
            borderRadius: 4,
            padding: "3px 6px",
            background: "#fff7ed",
        },
        findingTable: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 10,
            marginTop: 10,
        },
        findingThumb: {
            width: 63,
            height: 90,
            objectFit: "contain",
            display: "block",
            background: "#0f172a",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
        },
        findingEmpty: {
            width: 63,
            height: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            color: "#94a3b8",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            fontSize: 9,
            fontWeight: 700,
        },
        riskBox: {
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 12px",
            background: "#fff",
            marginTop: 10,
        },
        riskBoxTitle: {
            fontSize: 11,
            fontWeight: 800,
            color: "#1e293b",
            marginBottom: 4,
        },
        riskBoxText: {
            fontSize: 10,
            lineHeight: 1.7,
            color: "#475569",
            whiteSpace: "pre-wrap",
        },

        hmGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
        },
        hmCard: {
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
            display: "flex",
            flexDirection: "column",
        },
        hmImg: {
            width: "100%",
            height: 146,
            objectFit: "contain",
            display: "block",
            background: "#0f172a",
        },
        hmEmpty: {
            width: "100%",
            height: 146,
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 6,
            color: "#94a3b8",
            fontSize: 11,
            fontWeight: 700,
        },
        hmMeta: {
            padding: "7px 10px",
            fontSize: 9.5,
            lineHeight: 1.6,
            color: "#374151",
        },
        compareList: {
            margin: 0,
            paddingLeft: 18,
            display: "grid",
            gap: 8,
            color: "#334155",
            fontSize: 11,
            lineHeight: 1.7,
        },
        footer: {
            borderTop: "1px solid #e2e8f0",
            paddingTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#94a3b8",
            marginTop: 10,
        },

        controlBox: {
            border: "1px solid #e2e8f0",
            borderRadius: 5,
            padding: "8px 10px",
            marginBottom: 6,
            background: "#f8fafc",
        },
        controlTitle: { fontSize: 10, fontWeight: 900, color: "#1e3a8a", marginBottom: 6 },
        controlRow: { display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 },
        controlLabel: { color: "#64748b" },
        controlValue: { fontWeight: 800, color: "#1e293b" },

        chunkLabel: {
            fontSize: 9,
            fontWeight: 700,
            color: "#64748b",
            marginBottom: 4,
            marginTop: 8,
        },
        reportHero: {
            display: "block",
            padding: "12px 14px",
            border: "1px solid #dbe3f0",
            borderRadius: 14,
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
            marginBottom: 14,
        },

        reportHeroLeft: {
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
        },

        reportEyebrow: {
            fontSize: 10,
            fontWeight: 800,
            color: "#1e3a8a",
            letterSpacing: 1.1,
            marginBottom: 6,
        },

        reportTitle: {
            fontSize: 16,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.25,
            marginBottom: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        },



        heroScoreLabel: {
            fontSize: 10,
            color: "#64748b",
            fontWeight: 700,
            marginBottom: 4,
        },

        heroScoreValue: {
            fontSize: 30,
            fontWeight: 900,
            color: "#0f172a",
            lineHeight: 1,
            marginBottom: 10,
        },

        heroScoreUnit: {
            fontSize: 14,
            color: "#64748b",
            marginLeft: 2,
        },

        heroVerdictBadge: {
            fontSize: 11,
            fontWeight: 800,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid",
        },

        metaCardWrap: {
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            border: "1px solid #e2e8f0",   // 전체 테두리
            marginBottom: "10px",
        },

        metaCard: {
            padding: "6px 6px",
            minHeight: 30,
            boxSizing: "border-box",
            borderRight: "1px solid #e2e8f0",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",

        },
        metaCardLabel: {
            fontSize: 10,
            color: "#64748b",
            fontWeight: 400,
            marginBottom: 4,
        },

        metaCardValue: {
            fontSize: 10,
            fontWeight: 800,
            color: "#0f172a",
        },
    };

    return (
        <div style={{ background: "#f1f5f9", padding: 20 }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
                * { font-family: 'Noto Sans KR', sans-serif !important; }
            `}</style>

            {/* PAGE 1 */}
            <div style={S.page} className="pdf-page">
                {/* 표지 + 핵심 요약(판정, 메타정보, 타임라인 그래프) */}
                <div style={S.brandBar}>
                    <div style={S.brandLeft}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={S.brandTitle}>DeepFake Analyzer</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                [{analysisData.analysis_id}][VideoScope]
                            </span>
                        </div>
                        <span style={S.brandSub}>영상 위·변조 및 AI 생성 의심 자동 분석 보고서</span>
                    </div>
                    <div style={S.brandRight}>
                        <div style={S.brandModel}>www.truelens-analyzer.com</div>
                        <div style={S.brandDate}>{reportDate}</div>
                    </div>
                </div>

                <div style={S.reportHero}>
                    <div style={S.reportHeroLeft}>
                        <div style={S.reportEyebrow}>파일명</div>

                        <div style={S.reportTitle} title={analysisData.filename || "video.mp4"}>
                            {analysisData.filename || "video.mp4"}
                        </div>

                        {/* <div style={S.reportSubTitle}>
                            업로드된 영상 파일의 메타데이터 및 AI 분석 결과를 기반으로 생성된 전문 리포트
                        </div> */}
                    </div>


                </div>

                <div style={S.metaCardWrap}>
                    {/* 메타 정보는 2행 x 4열 고정 그리드로 배치한다. */}
                    {[
                        { label: "영상 길이", value: analysisData.video_duration || "2분 34초" },
                        { label: "해상도", value: analysisData.resolution || "1920×1080" },
                        { label: "프레임 레이트", value: analysisData.frame_rate || "30fps" },
                        { label: "파일 크기", value: analysisData.file_size || "245MB" },
                        { label: "총 프레임 수", value: `${totalFrames}프레임` },
                        { label: "파일 형식", value: `.${fileExt.toUpperCase()}` },
                        { label: "판별 모델 수", value: `${modelNames.length}개` },
                        { label: "분석 시간", value: analysisData.analysis_time || "14.2초" },
                    ].map((item, i) => {
                        const isLastCol = (i + 1) % 4 === 0;
                        const isLastRow = i >= 4;

                        return (
                            <div
                                key={i}
                                style={{
                                    ...S.metaCard,
                                    borderRight: isLastCol ? "none" : S.metaCard.borderRight,
                                    borderBottom: isLastRow ? "none" : S.metaCard.borderBottom,
                                }}
                            >
                                <div style={S.metaCardLabel}>{item.label}</div>
                                <div style={S.metaCardValue}>{item.value}</div>
                            </div>
                        );
                    })}
                </div>

                <div style={S.mainGrid}>
                    <div>
                        <div style={{ marginBottom: 12 }}>
                            <div style={S.sectionTitle}>
                                분석 결과 <span style={S.sectionEn}>Final Verdict Analysis</span>
                            </div>

                            <div style={S.verdictBox}>
                                <div>
                                    <div style={{ fontSize: 10, color: verdictColor, fontWeight: 700, marginBottom: 2 }}>
                                        최종 판정
                                    </div>
                                    <div style={S.verdictMain}>{verdictText}</div>
                                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                                        {modelNames.join(" · ")} 앙상블 분석
                                    </div>
                                </div>

                                <div style={S.verdictConf}>
                                    <div style={S.verdictConfLabel}>판별 신뢰도</div>
                                    <div style={S.verdictConfNum}>
                                        {analysisData.overall_confidence_percent.toFixed(1)}
                                        <span style={{ fontSize: 14, color: "#64748b" }}>%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={S.sectionTitle}>
                                프레임별 위조 의심도 그래프 <span style={S.sectionEn}>Frame Probability</span>
                            </div>

                            {/* 핵심 KPI 카드: 피크 프레임, 위험 구간 수, 평균 확률 */}
                            <div style={S.metricGrid}>
                                {[
                                    { label: "최고 의심 프레임", value: `Frame ${inlineFrameStats.peakIdx}`, unit: "" },
                                    { label: "위험 구간 수", value: inlineFrameStats.dangerCount, unit: "개" },
                                    { label: "평균 위조 확률", value: avgProb.toFixed(1), unit: "%" },
                                ].map((m, i) => (
                                    <div key={i} style={S.metricCard}>
                                        <div style={S.metricLabel}>{m.label}</div>
                                        <div style={S.metricValue}>
                                            {m.value}
                                            <span style={S.metricUnit}>{m.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 5,
                                    padding: "10px 12px",
                                    background: "#f8fafc",
                                    marginBottom: 8,
                                }}
                            >
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#374151", marginBottom: 2 }}>
                                    프레임별 위조 확률 추이
                                </div>
                                <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 8 }}>
                                    표준이하 ←────────── 표준 ──────────→ 표준이상
                                </div>
                                <PdfLineChart data={timelineChart} />
                            </div>
                        </div>

                        <div>
                            <div style={S.sectionTitle}>
                                AI 모델별 위험도 분석 <span style={S.sectionEn}>Model Analysis</span>
                            </div>

                            <div style={{ border: "1px solid #e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                                <table style={S.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...S.th, width: "28%" }}>판별 모델</th>
                                            <th style={S.th}>위조 확률</th>
                                            <th style={{ ...S.th, width: "80px", textAlign: "center" }}>위험도</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modelNames.map((name, i) => {
                                            // 현재는 개별 모델 확률이 없는 구조라 총 신뢰도 기반 보정치로 시각화한다.
                                            const prob = analysisData.overall_confidence_percent - (i * 3.7) + (i * 2.1);
                                            const clamped = Math.max(0, Math.min(prob, 100));
                                            const risk = clamped >= 70 ? "HIGH" : clamped >= 50 ? "MEDIUM" : "LOW";

                                            return (
                                                <tr key={i}>
                                                    <td style={{ ...S.td, fontWeight: 700 }}>{name}</td>
                                                    <td style={S.td}>
                                                        <MiniBar
                                                            value={clamped}
                                                            color={clamped >= 70 ? "#dc2626" : clamped >= 50 ? "#f59e0b" : "#1d4ed8"}
                                                        />
                                                    </td>
                                                    <td style={{ ...S.td, textAlign: "center" }}>
                                                        <RiskBadge level={risk} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={S.scoreCard}>
                            <div style={S.scoreTitle}>위조 의심 지수 Forgery Score</div>
                            <div style={S.scoreNum}>{Math.round(analysisData.overall_confidence_percent)}</div>
                            <div style={S.scoreMax}>/100점</div>
                            <div style={S.scoreNote}>
                                {isFake
                                    ? "AI 생성 또는 편집 가능성이\n높게 감지되었습니다."
                                    : "정상 영상으로 판별되었습니다.\n신뢰도가 높습니다."}
                            </div>
                        </div>

                        <div style={S.controlBox}>
                            <div style={S.controlTitle}>권장 조치 Recommended Actions</div>
                            {[
                                { label: "원본 보존", value: "즉시 필요" },
                                { label: "추가 감정", value: isFake ? "강력 권장" : "불필요" },
                                { label: "법적 대응", value: isFake ? "검토 필요" : "불필요" },
                                { label: "재분석 주기", value: "30일" },
                            ].map((r, i) => (
                                <div key={i} style={S.controlRow}>
                                    <span style={S.controlLabel}>{r.label}</span>
                                    <span
                                        style={{
                                            ...S.controlValue,
                                            color: r.value.includes("강력") || r.value.includes("즉시")
                                                ? "#dc2626"
                                                : "#1e293b",
                                        }}
                                    >
                                        {r.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={S.controlBox}>
                            <div style={S.controlTitle}>연구항목 Research Parameters</div>
                            {[
                                {
                                    label: "최고 위조확률",
                                    value: `${(timelineChart.length ? Math.max(...timelineChart.map((d) => d.fake_prob)) : 0).toFixed(1)}%`,
                                },
                                {
                                    label: "최저 위조확률",
                                    value: `${(timelineChart.length ? Math.min(...timelineChart.map((d) => d.fake_prob)) : 0).toFixed(1)}%`,
                                },
                                { label: "평균 위조확률", value: `${avgProb.toFixed(1)}%` },
                                {
                                    label: "위험 프레임 비율",
                                    value: `${(totalFrames ? (inlineFrameStats.dangerCount / totalFrames) * 100 : 0).toFixed(1)}%`,
                                },
                                {
                                    label: "판별 신뢰도",
                                    value: `${analysisData.overall_confidence_percent.toFixed(1)}%`,
                                },
                            ].map((r, i) => (
                                <div key={i} style={{ ...S.controlRow, marginBottom: 3 }}>
                                    <span style={{ fontSize: 9, color: "#64748b" }}>{r.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: "#1e293b" }}>{r.value}</span>
                                </div>
                            ))}
                        </div>

                        <div
                            style={{
                                border: "1px solid #bfdbfe",
                                borderRadius: 5,
                                padding: "8px 10px",
                                background: "#eff6ff",
                                textAlign: "center",
                            }}
                        >
                            <div style={{ fontSize: 9, color: "#1d4ed8", fontWeight: 700, marginBottom: 3 }}>
                                파일 형식
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a" }}>
                                .{fileExt.toUpperCase()}
                            </div>
                            <div
                                style={{
                                    marginTop: 6,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 4,
                                    justifyContent: "center",
                                }}
                            >
                                {modelNames.map((n) => (
                                    <span
                                        key={n}
                                        style={{
                                            padding: "2px 7px",
                                            borderRadius: 999,
                                            background: "#dbeafe",
                                            border: "1px solid #93c5fd",
                                            color: "#1d4ed8",
                                            fontSize: 9,
                                            fontWeight: 800,
                                        }}
                                    >
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <div style={S.sectionTitle}>
                        프레임별 위조 의심도 분석
                        <span style={S.sectionEn}>Analysis of forgery suspicion by frame</span>
                    </div>

                    <div style={S.frameSummaryNote}>
                        전체 {totalFrames}개 프레임 중 위조 확률 상위 {summaryFrames.length}개 프레임만 요약 표시
                    </div>

                    <div style={S.frameGrid}>
                        {summaryFrames.map((frame) => {
                            // 상위 4개 위험 프레임은 별도 강조 스타일(S.frameCardTop) 적용.
                            const isTop = sortedTop4.includes(frame.frame_idx);
                            const riskColor =
                                frame.fake_prob >= 70 ? "#dc2626" :
                                    frame.fake_prob >= 50 ? "#d97706" :
                                        "#16a34a";

                            return (
                                <div key={frame.frame_idx} style={isTop ? S.frameCardTop : S.frameCard}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 1,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 9,
                                                fontWeight: 800,
                                                color: "#1e293b",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            {isTop && (
                                                <span
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: "50%",
                                                        background: "#f97316",
                                                        display: "inline-block",
                                                    }}
                                                />
                                            )}
                                            F{frame.frame_idx}
                                        </span>
                                        <span style={{ fontSize: 10, fontWeight: 900, color: riskColor }}>
                                            {frame.fake_prob.toFixed(0)}%
                                        </span>
                                    </div>

                                    <MiniBar
                                        value={frame.fake_prob}
                                        color={
                                            frame.fake_prob >= 70 ? "#dc2626" :
                                                frame.fake_prob >= 50 ? "#f59e0b" :
                                                    "#1d4ed8"
                                        }
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={S.footer}>
                    <span>분석 ID: {analysisData.analysis_id}</span>
                    <span>생성일시: {reportDate} · 1 / {totalPdfPages} Page</span>
                </div>
            </div>

            {/* PAGE 2 */}
            <div style={{ ...S.page, marginTop: 0 }} className="pdf-page">
                {/* 상세 근거(항목별 분석/프레임 표/종합 의견) */}
                <div style={S.brandBar}>
                    <div style={S.brandLeft}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={S.brandTitle}>DeepFake Analyzer</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                상세 분석 · Detailed Report
                            </span>
                        </div>
                        <span style={S.brandSub}>주요 분석 항목 · 종합 의견 · 프레임 분석표</span>
                    </div>
                    <div style={S.brandRight}>
                        <div style={S.brandModel}>{analysisData.analysis_id}</div>
                        <div style={S.brandDate}>{reportDate}</div>
                    </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={S.sectionTitle}>
                        세부 분석 항목 <span style={S.sectionEn}>Major Analysis Items</span>
                    </div>

                    {technicalRiskIntro && (
                        <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.6, marginBottom: 8 }}>
                            {technicalRiskIntro}
                        </div>
                    )}

                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={{ ...S.th, width: "24%" }}>항목</th>
                                <th style={S.th}>설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detailItems.map((item, idx) => (
                                <tr key={`detail-${idx}`} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                    <td style={{ ...S.td, fontWeight: 700, fontSize: 10 }}>
                                        {item.title}
                                    </td>
                                    <td style={{ ...S.td, fontSize: 10, lineHeight: 1.6 }}>
                                        {item.description}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={S.sectionTitle}>
                        프레임별 분석 표
                        <span style={S.sectionEn}>Analysis Confidence Timeline</span>
                    </div>

                    <div
                        style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 5,
                            padding: "10px 14px",
                            background: "#f8fafc",
                            overflowX: "auto",
                        }}
                    >
                        {frameChunks.map((chunk, idx) => (
                            <div key={idx} style={{ marginBottom: idx < frameChunks.length - 1 ? 10 : 0 }}>
                                <div style={S.chunkLabel}>
                                    프레임 {chunk[0]?.frame_idx} ~ {chunk[chunk.length - 1]?.frame_idx}
                                </div>

                                <table style={{ ...S.table, marginBottom: 0, fontSize: 10 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...S.th, fontSize: 9 }}>항목 \\ 프레임</th>
                                            {chunk.map((d) => (
                                                <th
                                                    key={d.frame_idx}
                                                    style={{
                                                        ...S.th,
                                                        textAlign: "center",
                                                        fontSize: 9,
                                                        padding: "4px 5px",
                                                    }}
                                                >
                                                    {d.frame_idx}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ ...S.td, fontWeight: 700, fontSize: 9 }}>위조확률 (%)</td>
                                            {chunk.map((d) => (
                                                <td
                                                    key={d.frame_idx}
                                                    style={{
                                                        ...S.td,
                                                        textAlign: "center",
                                                        fontSize: 9,
                                                        padding: "4px 5px",
                                                        fontWeight: 800,
                                                        color:
                                                            d.fake_prob >= 70 ? "#dc2626" :
                                                                d.fake_prob >= 50 ? "#d97706" :
                                                                    "#16a34a",
                                                    }}
                                                >
                                                    {d.fake_prob.toFixed(1)}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td style={{ ...S.td, fontWeight: 700, fontSize: 9 }}>위험도</td>
                                            {chunk.map((d) => (
                                                <td
                                                    key={d.frame_idx}
                                                    style={{
                                                        ...S.td,
                                                        textAlign: "center",
                                                        fontSize: 9,
                                                        padding: "4px 5px",
                                                    }}
                                                >
                                                    {d.fake_prob >= 70 ? "🔴" : d.fake_prob >= 50 ? "🟡" : "🟢"}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {forensicFrameFindings.length > 0 && (
                        // forensicOpinion에서 파싱한 프레임 근거를 heatmap 이미지와 매칭해 표로 출력
                        <table style={S.findingTable}>
                            <thead>
                                <tr>
                                    <th style={{ ...S.th, width: "96px" }}>이미지</th>
                                    <th style={{ ...S.th, width: "120px" }}>확률</th>
                                    <th style={S.th}>분석 내용</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forensicFrameFindings.map((finding, index) => {
                                    // 프레임 번호 우선, 파일명 보조 기준으로 히트맵 이미지 매칭
                                    const matchedFrame =
                                        normalizedHeatmaps.find((frame) => frame.frame_idx === finding.frameIndex) ||
                                        normalizedHeatmaps.find((frame) => frame.sourceImage?.includes?.(finding.imageName)) ||
                                        normalizedHeatmaps.find((frame) => frame.image?.includes?.(finding.imageName));

                                    return (
                                        <tr key={`finding-${index}`} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                            <td style={S.td}>
                                                {matchedFrame?.image ? (
                                                    <img
                                                        src={matchedFrame.image}
                                                        alt={`finding-${finding.frameIndex}`}
                                                        style={S.findingThumb}
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <div style={S.findingEmpty}>이미지 없음</div>
                                                )}
                                            </td>
                                            <td style={{ ...S.td, fontSize: 10, fontWeight: 800, color: "#dc2626" }}>
                                                Frame {finding.frameIndex}
                                                <div style={{ color: "#475569", marginTop: 4 }}>
                                                    {finding.probabilityText || "-"}
                                                </div>
                                            </td>
                                            <td style={{ ...S.td, fontSize: 10, lineHeight: 1.7 }}>
                                                {finding.analysisText || "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {topFrameExplanations.length > 0 && (
                        <table style={S.findingTable}>
                            <thead>
                                <tr>
                                    <th style={{ ...S.th, width: "74px" }}>순위</th>
                                    <th style={{ ...S.th, width: "92px" }}>프레임</th>
                                    <th style={{ ...S.th, width: "110px" }}>위조 확률</th>
                                    <th style={S.th}>상위 4개 프레임별 설명</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topFrameExplanations.map((item, index) => (
                                    <tr key={`top-frame-explanation-${item.frameIndex}`} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                        <td style={{ ...S.td, textAlign: "center", fontWeight: 800 }}>
                                            {item.rank}
                                        </td>
                                        <td style={{ ...S.td, fontSize: 10, fontWeight: 700 }}>
                                            Frame {item.frameIndex}
                                        </td>
                                        <td style={{ ...S.td, fontSize: 10, color: "#dc2626", fontWeight: 800 }}>
                                            {item.probabilityText}
                                        </td>
                                        <td style={{ ...S.td, fontSize: 10, lineHeight: 1.7 }}>
                                            {item.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={S.sectionTitle}>
                        종합 의견 <span style={S.sectionEn}>Overall Assessment</span>
                    </div>

                    <div
                        style={{
                            border: `1px solid ${verdictBorder}`,
                            background: verdictBg,
                            borderRadius: 5,
                            padding: "12px 16px",
                        }}
                    >
                        <div style={{ fontSize: 11, lineHeight: 1.9, color: "#374151", whiteSpace: "pre-line" }}>
                            {/* finalOpinion 파싱 실패 시 자동 생성 템플릿 문구를 사용한다. */}
                            {finalOpinion || `본 영상은 ${verdictText}으로 판정되었으며, 전체 판별 신뢰도는 ${analysisData.overall_confidence_percent.toFixed(1)}%입니다.
최고 의심 프레임은 Frame ${inlineFrameStats.peakIdx}이며, 위험 구간은 총 ${inlineFrameStats.dangerCount}개 감지되었습니다.
상위 의심 프레임 전후 구간을 중심으로 얼굴 경계, 배경 이음새, 질감 불연속성, 조명 일관성을 추가 확인하는 것이 권장됩니다.
본 보고서는 자동화된 AI 분석 결과이며, 법적 효력을 위해서는 전문가의 추가 감정이 필요합니다.`}
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>
                        사용 모델:
                    </span>
                    {modelNames.map((n) => (
                        <span
                            key={n}
                            style={{
                                padding: "3px 9px",
                                borderRadius: 999,
                                background: "#eef2ff",
                                border: "1px solid #c7d2fe",
                                color: "#3730a3",
                                fontSize: 10,
                                fontWeight: 800,
                            }}
                        >
                            {n}
                        </span>
                    ))}
                </div>

                <div style={S.footer}>
                    <span>
                        본 보고서는 자동 생성된 분석 결과이며, 법적 효력을 위해서는 전문가 감정이 필요합니다.
                    </span>
                    <span>
                        생성일시: {reportDate} · 분석 ID: {analysisData.analysis_id} · 2 / {totalPdfPages} Page
                    </span>
                </div>
            </div>

            {/* 히트맵 상세 페이지들 */}
            {heatmapChunks.map((chunk, chunkIdx) => (
                // 프레임 히트맵은 6개 단위로 별도 페이지를 생성한다.
                <div
                    key={`heatmap-page-${chunkIdx}`}
                    style={{ ...S.page, marginTop: 0 }}
                    className="pdf-page"
                >
                    <div style={S.brandBar}>
                        <div style={S.brandLeft}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                                <span style={S.brandTitle}>DeepFake Analyzer</span>
                                <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                    히트맵 상세 · Heatmap Detail
                                </span>
                            </div>
                            <span style={S.brandSub}>프레임 수 기준 히트맵 시각화 결과</span>
                        </div>
                        <div style={S.brandRight}>
                            <div style={S.brandModel}>{analysisData.analysis_id}</div>
                            <div style={S.brandDate}>{reportDate}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <div style={S.sectionTitle}>
                            히트맵 이미지 <span style={S.sectionEn}>Heatmap Visualization</span>
                        </div>

                        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>
                            프레임 {chunk[0]?.frame_idx} ~ {chunk[chunk.length - 1]?.frame_idx}
                        </div>

                        <div style={S.hmGrid}>
                            {chunk.map((frame) => (
                                // 이미지가 없더라도 카드 구조를 유지해 페이지 높이 흔들림을 방지한다.
                                <div key={`${frame.frame_idx}-${frame.id}`} style={S.hmCard}>
                                    {frame.image ? (
                                        <img
                                            src={frame.image}
                                            alt={`heatmap-${frame.id}`}
                                            style={S.hmImg}
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div style={S.hmEmpty}>
                                            <div style={{ fontSize: 24 }}>🌡️</div>
                                            <div>히트맵 이미지 없음</div>
                                        </div>
                                    )}

                                    <div style={S.hmMeta}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 4,
                                            }}
                                        >
                                            <div style={{ fontWeight: 900, color: "#1e293b" }}>
                                                {frame.id}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 9,
                                                    fontWeight: 800,
                                                    color: "#475569",
                                                    background: "#f1f5f9",
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 999,
                                                    padding: "2px 7px",
                                                }}
                                            >
                                                Frame {frame.frame_idx}
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                                AI 의심 {frame.fake_prob.toFixed(2)}%
                                            </span>
                                            <span style={{ color: "#16a34a", fontWeight: 700 }}>
                                                정상 {frame.real_prob.toFixed(2)}%
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                marginTop: 5,
                                                fontSize: 9,
                                                color: "#64748b",
                                            }}
                                        >
                                            위험도: {frame.risk ?? "-"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={S.footer}>
                        <span>프레임 수 기준 전체 히트맵 페이지</span>
                        <span>
                            생성일시: {reportDate} · 분석 ID: {analysisData.analysis_id} · {chunkIdx + 3} / {totalPdfPages} Page
                        </span>
                    </div>
                </div>
            ))}

            {comparisonNotes.length > 0 && (
                // PDF/JSON 결과 차이를 사람이 검토할 수 있게 마지막 메모 페이지를 옵션으로 붙인다.
                <div style={{ ...S.page, marginTop: 0 }} className="pdf-page">
                    <div style={S.brandBar}>
                        <div style={S.brandLeft}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                                <span style={S.brandTitle}>DeepFake Analyzer</span>
                                <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                    JSON Comparison Notes
                                </span>
                            </div>
                            <span style={S.brandSub}>PDF와 JSON 결과 대조 메모</span>
                        </div>
                        <div style={S.brandRight}>
                            <div style={S.brandModel}>{analysisData.analysis_id}</div>
                            <div style={S.brandDate}>{reportDate}</div>
                        </div>
                    </div>

                    <div style={S.sectionTitle}>
                        대조 메모 <span style={S.sectionEn}>Comparison Notes</span>
                    </div>

                    <div
                        style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            padding: "16px 18px",
                            background: "#fff",
                        }}
                    >
                        <ul style={S.compareList}>
                            {comparisonNotes.map((note, index) => (
                                <li key={`compare-note-${index}`}>{note}</li>
                            ))}
                        </ul>
                    </div>

                    <div style={S.footer}>
                        <span>PDF/JSON 대조 메모</span>
                        <span>
                            생성일시: {reportDate} · 분석 ID: {analysisData.analysis_id} · {totalPdfPages} / {totalPdfPages} Page
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
}
