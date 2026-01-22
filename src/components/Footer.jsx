// src/components/Footer.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function Footer() {
    return (
        <footer>
            <div className="wrap">
                <div className="btm-text">
                    <p>졸업설계 프로젝트</p>
                    <div className="logo">
                        <NavLink to="/">
                            <img src="" alt="no image" />
                        </NavLink>
                    </div>
                </div>
            </div>
        </footer>
    );
}
