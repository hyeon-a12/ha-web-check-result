// src/pages/JoinPage.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function JoinPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        joinId: "",
        joinPw: "",
        joinPw2: "",
        joinName: "",
        joinEmail: "",
    });

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = (e) => {
        e.preventDefault();

        if (!form.joinId.trim()) return alert("아이디를 입력하세요.");
        if (!form.joinPw) return alert("비밀번호를 입력하세요.");
        if (form.joinPw !== form.joinPw2) return alert("비밀번호가 일치하지 않습니다.");
        if (!form.joinName.trim()) return alert("이름을 입력하세요.");
        if (!form.joinEmail.trim()) return alert("이메일을 입력하세요.");

        // TODO: 서버 연동/DB 저장 로직 연결
        alert("회원가입 완료(예시). 로그인 페이지로 이동합니다.");
        navigate("/login");
    };

    return (
        <div id="main">
            <div className="wrap">
                <div className="login-wrap">
                    <div className="login-card">
                        <h2 className="login-title">회원가입</h2>
                        <p className="login-sub">필수 정보를 입력하고 계정을 생성하세요.</p>

                        <form className="login-form" onSubmit={onSubmit}>
                            <label className="login-label" htmlFor="joinId">
                                아이디
                            </label>
                            <input
                                id="joinId"
                                name="joinId"
                                className="login-input"
                                type="text"
                                placeholder="아이디를 입력하세요"
                                value={form.joinId}
                                onChange={onChange}
                            />

                            <label className="login-label" htmlFor="joinPw">
                                비밀번호
                            </label>
                            <input
                                id="joinPw"
                                name="joinPw"
                                className="login-input"
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                value={form.joinPw}
                                onChange={onChange}
                            />

                            <label className="login-label" htmlFor="joinPw2">
                                비밀번호 확인
                            </label>
                            <input
                                id="joinPw2"
                                name="joinPw2"
                                className="login-input"
                                type="password"
                                placeholder="비밀번호를 다시 입력하세요"
                                value={form.joinPw2}
                                onChange={onChange}
                            />

                            <label className="login-label" htmlFor="joinName">
                                이름
                            </label>
                            <input
                                id="joinName"
                                name="joinName"
                                className="login-input"
                                type="text"
                                placeholder="이름을 입력하세요"
                                value={form.joinName}
                                onChange={onChange}
                            />

                            <label className="login-label" htmlFor="joinEmail">
                                이메일
                            </label>
                            <input
                                id="joinEmail"
                                name="joinEmail"
                                className="login-input"
                                type="email"
                                placeholder="example@email.com"
                                value={form.joinEmail}
                                onChange={onChange}
                            />

                            <button className="login-btn" type="submit">
                                회원가입
                            </button>

                            <div className="login-foot">
                                <span>이미 계정이 있으신가요?</span>{" "}
                                <NavLink className="signup-link" to="/login">
                                    로그인하러 가기 →
                                </NavLink>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
