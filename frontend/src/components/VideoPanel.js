// src/components/VideoPanel.js
import React, { useState } from "react";
import { PlayFill, ArrowsAngleExpand } from "react-bootstrap-icons";
import "./VideoPanel.css";

const getYouTubeId = (url) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^#&?]{11})/);
    return match ? match[1] : null;
};

const VideoPanel = ({ videos, videoMessage }) => {
    const [activeId, setActiveId] = useState(null);

    if (!videos || videos.length === 0) return null;

    return (
        <div className="video-panel">
            {videoMessage && (
                <p className="video-panel-title">{videoMessage}</p>
            )}

            {/* Inline player */}
            {activeId && (
                <div className="video-player-wrapper">
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${activeId}?autoplay=1`}
                        title="Exercise video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}

            <div className="video-cards-row">
                {videos.map((video) => {
                    const ytId = getYouTubeId(video.link);
                    const isPlaying = activeId === ytId;

                    return (
                        <div
                            key={video.id}
                            className={`video-card ${isPlaying ? "video-card--active" : ""}`}
                        >
                            {/* Thumbnail */}
                            {ytId && (
                                <div
                                    className="video-thumb"
                                    onClick={() => setActiveId(isPlaying ? null : ytId)}
                                >
                                    <img
                                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                        alt={video.title}
                                        loading="lazy"
                                    />
                                    <div className="video-thumb-overlay">
                                        <PlayFill size={28} color="#fff" />
                                    </div>
                                </div>
                            )}

                            <div className="video-card-body">
                                <p className="video-card-title">{video.title}</p>

                                <div className="video-card-actions">
                                    <button
                                        className={`btn-play-inline ${isPlaying ? "btn-play-inline--stop" : ""}`}
                                        onClick={() => setActiveId(isPlaying ? null : ytId)}
                                    >
                                        {isPlaying ? "Close" : "Play here"}
                                    </button>

                                    {/* ✅ FIXED anchor tag */}
                                    <a
                                        href={video.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-open-yt"
                                    >
                                        <ArrowsAngleExpand size={12} />
                                        YouTube
                                    </a>
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