import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header"
import Footer from "./components/Footer"

import HomePage from "./pages/HomePage";
import IntroPage from "./pages/IntroPage";
import GalleryPage from "./pages/GalleryPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import JoinPage from "./pages/JoinPage";

export default function App() {
    return (
        <div id="all">
            <Header />

            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/intro" element={<IntroPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <Footer />
        </div>
    );
}
