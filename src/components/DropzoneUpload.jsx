import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";

const DropzoneUpload = forwardRef(function DropzoneUpload({ onChange }, ref) {
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);

    const fileName = useMemo(() => (file ? file.name : "선택된 파일 없음"), [file]);
    const isVideo = file?.type?.startsWith("video/");

    const reset = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        setPreviewSrc("");
        setIsDragOver(false);
        onChange?.(null, "", "image");
    };

    const readFileAsDataURL = (nextFile) => {
        if (!nextFile) {
            reset();
            return;
        }

        const isImage = nextFile.type?.startsWith("image/");
        const isVideoFile = nextFile.type?.startsWith("video/");

        if (!isImage && !isVideoFile) {
            alert("이미지 또는 영상 파일만 업로드할 수 있습니다.");
            reset();
            return;
        }

        if (isVideoFile) {
            const src = URL.createObjectURL(nextFile);
            setFile(nextFile);
            setPreviewSrc(src);
            onChange?.(nextFile, src, "video");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const src = String(reader.result);
            setFile(nextFile);
            setPreviewSrc(src);
            onChange?.(nextFile, src, "image");
        };
        reader.readAsDataURL(nextFile);
    };

    const openPicker = () => fileInputRef.current?.click();

    useImperativeHandle(ref, () => ({ openPicker, reset }));

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
                accept="image/*,video/*"
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
                    readFileAsDataURL(e.dataTransfer.files?.[0]);
                }}
            >
                {!previewSrc ? (
                    <div className="dropzone-text">
                        <p className="dropzone-title">여기로 드래그</p>
                        <p className="dropzone-sub">또는 위의 "파일 업로드"를 눌러 업로드</p>
                    </div>
                ) : isVideo ? (
                    <video
                        className="dz-preview"
                        src={previewSrc}
                        controls
                        muted
                        style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "8px" }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <img className="dz-preview" alt="업로드 미리보기" src={previewSrc} />
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
