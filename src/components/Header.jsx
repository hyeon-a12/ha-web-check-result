import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setMobileMenuOpen(false);
            }
        };

        if (mobileMenuOpen) {
            window.addEventListener("keydown", onKeyDown);
        }

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mobileMenuOpen]);

    const navClass = ({ isActive }) => (isActive ? "menu-link active" : "menu-link");

    return (
        <header id="header">
            <div className="wrap">
                <div className="header-top">
                    <div className="logo">
                        <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>
                            <img src={logo} alt="logo" />
                        </NavLink>
                    </div>

                    <ul className="menus">
                        <li>
                            <NavLink to="/" className={navClass}>
                                홈
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/intro" className={navClass}>
                                스토어
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/gallery" className={navClass}>
                                AI 갤러리
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/history" className={navClass}>
                                히스토리
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/login" className={navClass}>
                                로그인
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/join" className={navClass}>
                                회원가입
                            </NavLink>
                        </li>
                    </ul>

                    <div className="right">
                        <select name="language" id="language">
                            <option value="한국어">한국어</option>
                            <option value="영어">영어</option>
                            <option value="일본어">일본어</option>
                        </select>

                        <button
                            type="button"
                            className={`hamburger ${mobileMenuOpen ? "active" : ""}`}
                            aria-label="메뉴 열기"
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`mobile-dim ${mobileMenuOpen ? "show" : ""}`} onClick={() => setMobileMenuOpen(false)} />

            <nav className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`} aria-label="모바일 메뉴">
                <div className="drawer-head">
                    <p className="drawer-title">메뉴</p>
                    <button
                        type="button"
                        className="drawer-close"
                        aria-label="메뉴 닫기"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <ul className="drawer-menus">
                    <li>
                        <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            홈
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/intro" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            스토어
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/gallery" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            AI 갤러리
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/history" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            히스토리
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            로그인
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/join" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            회원가입
                        </NavLink>
                    </li>
                </ul>

                <div className="drawer-lang">
                    <p className="drawer-lang-title">언어</p>
                    <select name="language_mobile" id="language_mobile">
                        <option value="한국어">한국어</option>
                        <option value="영어">영어</option>
                        <option value="일본어">일본어</option>
                    </select>
                </div>
            </nav>
        </header>
    );
}
