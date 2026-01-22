// src/pages/HistoryPage.jsx
import React, { useMemo } from "react";

export default function HistoryPage() {
    // 예시 데이터 (나중에 localStorage/DB로 교체 가능)
    const items = useMemo(
        () => [
            {
                id: 1,
                name: "product_demo_clip1",
                date: "Jan 7, 2026 11:15 am",
                badgeClass: "high",
                badgeText: "AI 생성 가능성 높음",
            },
            {
                id: 2,
                name: "product_demo_clip2",
                date: "Jan 15, 2026 13:16 pm",
                badgeClass: "medium",
                badgeText: "AI 생성 가능성 중간",
            },
            {
                id: 3,
                name: "product_demo_clip3",
                date: "Jan 19, 2026 19:49 pm",
                badgeClass: "low",
                badgeText: "AI 생성 가능성 낮음",
            },
            {
                id: 4,
                name: "product_demo_clip4",
                date: "Jan 20, 2026 12:24 pm",
                badgeClass: "high",
                badgeText: "AI 생성 가능성 높음",
            },
            {
                id: 5,
                name: "product_demo_clip5",
                date: "Jan 23, 2026 21:02 pm",
                badgeClass: "low",
                badgeText: "AI 생성 가능성 낮음",
            },
            {
                id: 6,
                name: "product_demo_clip6",
                date: "Jan 26, 2026 10:51 am",
                badgeClass: "medium",
                badgeText: "AI 생성 가능성 중간",
            },
            {
                id: 7,
                name: "product_demo_clip7",
                date: "Jan 28, 2026 15:34 pm",
                badgeClass: "high",
                badgeText: "AI 생성 가능성 높음",
            },
        ],
        []
    );

    const handleClearAll = () => {
        alert("전체 삭제 기능은 아직 연결되지 않았습니다.");
    };

    const handleView = (item) => {
        alert(`보기: ${item.name} (기능 미연결)`);
    };

    const handleDelete = (item) => {
        alert(`삭제: ${item.name} (기능 미연결)`);
    };

    return (
        <div id="main">
            <div className="wrap">
                <section className="history-section">
                    {/* 제목 영역 */}
                    <div className="history-header">
                        <h2 className="history-title">최근 분석 내역</h2>

                        <button type="button" className="clear-all" onClick={handleClearAll}>
                            전체 삭제
                        </button>
                    </div>

                    {/* 안내 문구 */}
                    <div className="history-notice">
                        분석 내역은 브라우저에만 저장되며 서버에는 기록되지 않습니다.
                    </div>

                    {/* 히스토리 리스트 */}
                    <div className="history-list">
                        {items.map((item) => (
                            <div className="history-item" key={item.id}>
                                <div className="file-info">
                                    <img src="/img/file_icon.png" alt="file" />
                                    <div>
                                        <p className="file-name">{item.name}</p>
                                        <span className="date">{item.date}</span>
                                    </div>
                                </div>

                                <div className="right-group">
                                    <div className="result">
                                        <span className={`badge ${item.badgeClass}`}>{item.badgeText}</span>
                                    </div>

                                    <div className="actions">
                                        <button type="button" onClick={() => handleView(item)} aria-label="view">
                                            👁
                                        </button>
                                        <button type="button" onClick={() => handleDelete(item)} aria-label="delete">
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
