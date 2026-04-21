// src/components/VideoPanel.js
import React, { useState } from "react";
import { HeartFill, Heart } from "react-bootstrap-icons";
import { api } from "../services/api";

const VideoPanel = ({ videos, videoMessage }) => {
    const [likedIds, setLikedIds] = useState({});
    const [likeErrors, setLikeErrors] = useState({});

    if (!videos || videos.length === 0) return null;

    const handleLike = async (video) => {
        const videoId = video.videoId || video.id || video.youtubeId || "";
        if (!videoId) return;

        try {
            const result = await api.likeVideo({
                videoId,
                title: video.title || "Untitled",
                thumbnailUrl: video.thumbnail || video.thumbnailUrl || "",
                youtubeUrl:
                    video.url ||
                    video.youtubeUrl ||
                    `https://youtube.com/watch?v=${videoId}`,
            });
            setLikedIds((prev) => ({ ...prev, [videoId]: result.liked !== false }));
            setLikeErrors((prev) => ({ ...prev, [videoId]: false }));
        } catch (e) {
            console.error("Like failed:", e.message);
            setLikeErrors((prev) => ({ ...prev, [videoId]: true }));
        }
    };

    return (
        <div style={{ marginTop: "10px" }}>
            {videoMessage && (
                <p style={{ fontSize: "13px", color: "#b46cff", marginBottom: "8px" }}>
                    {videoMessage}
                </p>
            )}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {videos.map((video) => {
                    const videoId =
                        video.videoId ||
                        video.id ||
                        video.youtubeId ||
                        String(Math.random());
                    const isLiked = likedIds[videoId];
                    const hasError = likeErrors[videoId];
                    const videoUrl =
                        video.url ||
                        video.youtubeUrl ||
                        `https://youtube.com/watch?v=${videoId}`;
                    const thumbUrl =
                        video.thumbnail || video.thumbnailUrl || "";

                    return (
                        <div
                            key={videoId}
                            style={{
                                width: "200px",
                                borderRadius: "10px",
                                overflow: "hidden",
                                backgroundColor: "rgba(60,40,80,0.8)",
                                border: "1px solid #2c1a4b",
                                position: "relative",
                                flexShrink: 0,
                            }}
                        >
                            <a href={videoUrl} target="_blank" rel="noreferrer">
                                <img
                                    src={thumbUrl}
                                    alt={video.title || "Video"}
                                    style={{ width: "100%", height: "110px", objectFit: "cover" }}
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                    }}
                                />
                            </a>

                            <div style={{ padding: "8px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "#ddd",
                                        margin: 0,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {(video.title || "").slice(0, 60)}
                                </p>
                            </div>

                            <button
                                onClick={() => handleLike(video)}
                                title={
                                    hasError
                                        ? "Login required to like"
                                        : isLiked
                                            ? "Unlike"
                                            : "Like"
                                }
                                style={{
                                    position: "absolute",
                                    top: "6px",
                                    right: "6px",
                                    background: "rgba(0,0,0,0.55)",
                                    border: "none",
                                    borderRadius: "50%",
                                    padding: "5px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    outline: "none",
                                }}
                            >
                                {isLiked ? (
                                    <HeartFill size={14} color="#e74c3c" />
                                ) : (
                                    <Heart size={14} color={hasError ? "#e74c3c" : "#fff"} />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VideoPanel;