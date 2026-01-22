import React from "react";
import { NavLink } from "react-router-dom";

export default function Header() {
    return (
        <header id="header">
            <div className="wrap">
                <div className="header-top">
                    <div className="logo">
                        <NavLink to="/">
                            <img src="" alt="no image" />
                        </NavLink>
                    </div>

                    <ul className="menus">
                        <li><NavLink to="/">홈</NavLink></li>
                        <li><NavLink to="/intro">소개</NavLink></li>
                        <li><NavLink to="/gallery">AI 갤러리</NavLink></li>
                        <li><NavLink to="/history">히스토리</NavLink></li>
                        <li><NavLink to="/login">로그인</NavLink></li>
                        <li><NavLink to="/join">회원가입</NavLink></li>
                    </ul>

                    <div className="right">
                        <select name="language" id="language">
                            <option value="한국어">한국어</option>
                            <option value="영어">영어</option>
                            <option value="일본어">일본어</option>
                        </select>
                    </div>
                </div>
            </div>
        </header>
    );
}
