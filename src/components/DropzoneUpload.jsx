// src/components/DropzoneUpload.jsx
import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";

const DropzoneUpload = forwardRef(function DropzoneUpload({ onChange }, ref) {
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);

    const fileName = useMemo(() => (file ? file.name : "선택된 파일 없음"), [file]);

    const reset = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        setPreviewSrc("");
        setIsDragOver(false);
        onChange?.(null, "");
    };

    const readFileAsDataURL = (nextFile) => {
        if (!nextFile) {
            reset();
            return;
        }

        if (!nextFile.type?.startsWith("image/")) {
            alert("이미지 파일만 업로드할 수 있습니다.");
            reset();
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (!result) return;
            const src = String(result);

            setFile(nextFile);
            setPreviewSrc(src);
            onChange?.(nextFile, src);
        };
        reader.readAsDataURL(nextFile);
    };

    const openPicker = () => fileInputRef.current?.click();

    // 부모(HomePage)에서 탭 클릭 시 openPicker를 호출할 수 있게 노출
    useImperativeHandle(ref, () => ({
        openPicker,
        reset,
    }));

    const prevent = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className="tb tb-file" style={{ display: "block" }}>
            <input
                ref={fileInputRef}
                type="file"
                className="file-input"
                accept="image/*"
                hidden
                onChange={(e) => readFileAsDataURL(e.target.files?.[0])}
            />

            <div
                className={`dropzone ${isDragOver ? "is-dragover" : ""} ${previewSrc ? "has-image" : ""}`}
                tabIndex={0}
                role="button"
                onClick={openPicker}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPicker();
                    }
                }}
                onDragEnter={(e) => {
                    prevent(e);
                    setIsDragOver(true);
                }}
                onDragOver={(e) => {
                    prevent(e);
                    setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                    prevent(e);
                    setIsDragOver(false);
                }}
                onDrop={(e) => {
                    prevent(e);
                    setIsDragOver(false);
                    const dropped = e.dataTransfer.files?.[0];
                    readFileAsDataURL(dropped);
                }}
            >
                {!previewSrc ? (
                    <div className="dropzone-text">
                        <p className="dropzone-title">여긴 드래그</p>
                        <p className="dropzone-sub">또는 위의 “파일 업로드”를 눌러 업로드</p>
                    </div>
                ) : (
                    <img className="dz-preview" alt="업로드 이미지 미리보기" src={previewSrc} />
                )}
            </div>

            <div className="upload-row">
                <span className="file-status" style={{ display: file ? "inline-block" : "none" }}>
                    {fileName}
                </span>
            </div>
        </div>
    );
});

export default DropzoneUpload;
