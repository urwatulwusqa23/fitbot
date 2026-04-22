// src/components/VideoPanel.js
import React, { useState } from "react";
import { HeartFill, Heart, PlayFill, ArrowsAngleExpand, PersonBoundingBox } from "react-bootstrap-icons";
import { api } from "../services/api";
import "./VideoPanel.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([^#&?]{11})/);
    return match ? match[1] : null;
};

const resolveVideoId = (video) =>
    video.videoId || video.id || video.youtubeId || String(Math.random());

const resolveYouTubeUrl = (video, videoId) =>
    video.url ||
    video.youtubeUrl ||
    video.link ||
    `https://youtube.com/watch?v=${videoId}`;

const resolveThumbnail = (video, ytId) => {
    if (video.thumbnail || video.thumbnailUrl) return video.thumbnail || video.thumbnailUrl;
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    return "";
};

// ── Component ─────────────────────────────────────────────────────────────────

const VideoPanel = ({ videos, videoMessage, onPoseDetect }) => {
    const [activeYtId, setActiveYtId] = useState(null); // currently playing embed
    const [likedIds, setLikedIds] = useState({});
    const [likeErrors, setLikeErrors] = useState({});

    if (!videos || videos.length === 0) return null;

    // ── Like handler ──────────────────────────────────────────────────────────
    const handleLike = async (video) => {
        const videoId = resolveVideoId(video);
        if (!videoId) return;

        try {
            const result = await api.likeVideo({
                videoId,
                title: video.title || "Untitled",
                thumbnailUrl: video.thumbnail || video.thumbnailUrl || "",
                youtubeUrl: resolveYouTubeUrl(video, videoId),
            });
            setLikedIds((prev) => ({ ...prev, [videoId]: result.liked !== false }));
            setLikeErrors((prev) => ({ ...prev, [videoId]: false }));
        } catch (e) {
            console.error("Like failed:", e.message);
            setLikeErrors((prev) => ({ ...prev, [videoId]: true }));
        }
    };

    return (
        <div className="video-panel">
            {videoMessage && (
                <p className="video-panel-title">{videoMessage}</p>
            )}

            {/* ── Inline YouTube Player ── */}
            {activeYtId && (
                <div className="video-player-wrapper">
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${activeYtId}?autoplay=1`}
                        title="Exercise video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}

            {/* ── Video Cards ── */}
            <div className="video-cards-row">
                {videos.map((video) => {
                    const videoId = resolveVideoId(video);
                    const ytId = getYouTubeId(resolveYouTubeUrl(video, videoId));
                    const isPlaying = activeYtId === ytId;
                    const isLiked = likedIds[videoId];
                    const hasError = likeErrors[videoId];
                    const thumbUrl = resolveThumbnail(video, ytId);
                    const youtubeUrl = resolveYouTubeUrl(video, videoId);

                    return (
                        <div
                            key={videoId}
                            className={`video-card ${isPlaying ? "video-card--active" : ""}`}
                        >
                            {/* Thumbnail with play overlay */}
                            <div
                                className="video-thumb"
                                onClick={() => ytId && setActiveYtId(isPlaying ? null : ytId)}
                            >
                                {thumbUrl && (
                                    <img
                                        src={thumbUrl}
                                        alt={video.title || "Video"}
                                        loading="lazy"
                                        onError={(e) => { e.target.style.display = "none"; }}
                                    />
                                )}
                                <div className="video-thumb-overlay">
                                    <PlayFill size={28} color="#fff" />
                                </div>

                                {/* ❤ Like button — top-right of thumbnail */}
                                <button
                                    className="btn-like"
                                    onClick={(e) => { e.stopPropagation(); handleLike(video); }}
                                    title={hasError ? "Login required to like" : isLiked ? "Unlike" : "Like"}
                                >
                                    {isLiked
                                        ? <HeartFill size={13} color="#e74c3c" />
                                        : <Heart size={13} color={hasError ? "#e74c3c" : "#fff"} />
                                    }
                                </button>
                            </div>

                            {/* Card body */}
                            <div className="video-card-body">
                                <p className="video-card-title">
                                    {(video.title || "").slice(0, 60)}
                                </p>

                                <div className="video-card-actions">
                                    {/* Play inline / Close */}
                                    {ytId && (
                                        <button
                                            className={`btn-play-inline ${isPlaying ? "btn-play-inline--stop" : ""}`}
                                            onClick={() => setActiveYtId(isPlaying ? null : ytId)}
                                        >
                                            {isPlaying ? "Close" : "Play here"}
                                        </button>
                                    )}

                                    {/* Open on YouTube */}
                                    <a
                                        href={youtubeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-open-yt"
                                    >
                                        <ArrowsAngleExpand size={11} />
                                        YouTube
                                    </a>

                                    {/* Pose Detection (optional — only shown if handler provided) */}
                                    {onPoseDetect && (
                                        <button
                                            className="btn-pose"
                                            onClick={() => onPoseDetect(video)}
                                            title="Pose Detection"
                                        >
                                            <PersonBoundingBox size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VideoPanel;