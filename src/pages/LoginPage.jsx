// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function LoginPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        userId: "",
        userPw: "",
    });

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = (e) => {
        e.preventDefault();

        if (!form.userId.trim()) return alert("아이디를 입력하세요.");
        if (!form.userPw) return alert("비밀번호를 입력하세요.");

        // TODO: 서버 연동/인증 로직 연결
        alert("로그인 성공(예시). 메인으로 이동합니다.");
        navigate("/");
    };

    return (
        <div id="main">
            <div className="wrap">
                <div className="login-wrap">
                    <div className="login-card">
                        <h2 className="login-title">로그인</h2>
                        <p className="login-sub">서비스 이용을 위해 로그인 해주세요.</p>

                        <form className="login-form" onSubmit={onSubmit}>
                            <label className="login-label" htmlFor="userId">
                                아이디
                            </label>
                            <input
                                id="userId"
                                name="userId"
                                className="login-input"
                                type="text"
                                placeholder="아이디를 입력하세요"
                                value={form.userId}
                                onChange={onChange}
                            />

                            <label className="login-label" htmlFor="userPw">
                                비밀번호
                            </label>
                            <input
                                id="userPw"
                                name="userPw"
                                className="login-input"
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                value={form.userPw}
                                onChange={onChange}
                            />

                            <button className="login-btn" type="submit">
                                로그인
                            </button>

                            <div className="login-foot">
                                <span>아직 계정이 없으신가요?</span>{" "}
                                <NavLink className="signup-link" to="/join">
                                    회원가입하러 가기 →
                                </NavLink>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
