import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { HeartFill } from "react-bootstrap-icons";
import NavBar from "../components/NavBar";
import { api } from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./SavedPlans.css";

// ── Tab button ────────────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon, label, count }) => (
    <button onClick={onClick} className={`saved-tab-btn ${active ? "active" : ""}`}>
        {icon}
        <span>{label}</span>
        {count > 0 && <span className="saved-tab-count">{count}</span>}
    </button>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon, message, hint }) => (
    <div className="saved-empty">
        <div className="saved-empty-icon">{icon}</div>
        <p className="saved-empty-msg">{message}</p>
        <p className="saved-empty-hint">{hint}</p>
    </div>
);

// ── Extract content from planJson safely ──────────────────────────────────────
const extractContent = (planJson) => {
    if (!planJson) return "";
    try {
        // If it's already an object
        if (typeof planJson === "object") {
            return planJson.content || planJson.Content || planJson.text || planJson.Text || JSON.stringify(planJson);
        }
        // If it's a string — try parsing as JSON
        const parsed = JSON.parse(planJson);
        return parsed.content || parsed.Content || parsed.text || parsed.Text || planJson;
    } catch {
        // Not valid JSON — return as plain text
        return planJson;
    }
};

// ── Markdown renderer ─────────────────────────────────────────────────────────
const PlanContent = ({ content }) => {
    if (!content) return <p style={{ color: "#666", fontSize: "13px" }}>No content available.</p>;

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                table: ({ node, ...props }) => (
                    <div style={{ overflowX: "auto", marginTop: "10px" }}>
                        <table
                            style={{
                                borderCollapse: "collapse",
                                width: "100%",
                                fontSize: "13px",
                            }}
                            {...props}
                        />
                    </div>
                ),
                thead: ({ node, ...props }) => (
                    <thead style={{ backgroundColor: "rgba(126,58,228,0.4)" }} {...props} />
                ),
                th: ({ node, ...props }) => (
                    <th
                        style={{
                            padding: "8px 12px",
                            border: "1px solid rgba(126,58,228,0.3)",
                            textAlign: "left",
                            fontWeight: 600,
                            color: "#e0d0ff",
                        }}
                        {...props}
                    />
                ),
                td: ({ node, ...props }) => (
                    <td
                        style={{
                            padding: "7px 12px",
                            border: "1px solid rgba(126,58,228,0.2)",
                            color: "#ccc",
                        }}
                        {...props}
                    />
                ),
                tr: ({ node, ...props }) => (
                    <tr
                        style={{ backgroundColor: "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(126,58,228,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        {...props}
                    />
                ),
                p: ({ node, ...props }) => (
                    <p style={{ margin: "6px 0", lineHeight: 1.7, color: "#ccc", fontSize: "13px" }} {...props} />
                ),
                ul: ({ node, ...props }) => (
                    <ul style={{ paddingLeft: "20px", margin: "6px 0", color: "#ccc", fontSize: "13px" }} {...props} />
                ),
                ol: ({ node, ...props }) => (
                    <ol style={{ paddingLeft: "20px", margin: "6px 0", color: "#ccc", fontSize: "13px" }} {...props} />
                ),
                li: ({ node, ...props }) => (
                    <li style={{ margin: "4px 0", color: "#ccc" }} {...props} />
                ),
                strong: ({ node, ...props }) => (
                    <strong style={{ color: "#b46cff" }} {...props} />
                ),
                h1: ({ node, ...props }) => (
                    <h1 style={{ color: "#e0d0ff", fontSize: "18px", margin: "14px 0 6px", fontWeight: 600 }} {...props} />
                ),
                h2: ({ node, ...props }) => (
                    <h2 style={{ color: "#e0d0ff", fontSize: "16px", margin: "12px 0 5px", fontWeight: 600 }} {...props} />
                ),
                h3: ({ node, ...props }) => (
                    <h3 style={{ color: "#e0d0ff", fontSize: "14px", margin: "10px 0 4px", fontWeight: 600 }} {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                    <blockquote
                        style={{
                            borderLeft: "3px solid #7e3ae4",
                            paddingLeft: "12px",
                            margin: "8px 0",
                            color: "#999",
                            fontStyle: "italic",
                        }}
                        {...props}
                    />
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

// ── Diet Plan Card ────────────────────────────────────────────────────────────
const DietPlanCard = ({ plan }) => {
    const [expanded, setExpanded] = useState(false);
    const content = extractContent(plan.planJson);

    return (
        <div className="saved-card">
            <div className="saved-card-header">
                <div>
                    <span className="saved-card-badge diet">🥗 Diet Plan</span>
                    <h4 className="saved-card-title">{plan.title}</h4>
                    <span className="saved-card-meta">
                        {plan.planType} &nbsp;·&nbsp;
                        {new Date(plan.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                        })}
                    </span>
                </div>
                <button
                    className="saved-card-expand"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? "▲ Hide" : "▼ View Plan"}
                </button>
            </div>

            {expanded && (
                <div className="saved-card-content">
                    <PlanContent content={content} />
                </div>
            )}
        </div>
    );
};

// ── Exercise Plan Card ────────────────────────────────────────────────────────
const ExercisePlanCard = ({ plan }) => {
    const [expanded, setExpanded] = useState(false);
    const content = extractContent(plan.planJson);

    return (
        <div className="saved-card">
            <div className="saved-card-header">
                <div>
                    <span className="saved-card-badge exercise">💪 Workout Plan</span>
                    <h4 className="saved-card-title">{plan.title}</h4>
                    <span className="saved-card-meta">
                        {plan.splitType} &nbsp;·&nbsp;
                        {new Date(plan.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                        })}
                    </span>
                </div>
                <button
                    className="saved-card-expand"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? "▲ Hide" : "▼ View Plan"}
                </button>
            </div>

            {expanded && (
                <div className="saved-card-content">
                    <PlanContent content={content} />
                </div>
            )}
        </div>
    );
};

// ── Liked Video Card ──────────────────────────────────────────────────────────
const LikedVideoCard = ({ video, onUnlike }) => {
    const [unliking, setUnliking] = useState(false);

    const handleUnlike = async () => {
        setUnliking(true);
        try {
            await api.likeVideo({
                videoId: video.videoId,
                title: video.title,
                thumbnailUrl: video.thumbnailUrl,
                youtubeUrl: video.youtubeUrl,
            });
            onUnlike(video.videoId);
        } catch (e) {
            console.error("Unlike failed:", e);
        } finally {
            setUnliking(false);
        }
    };

    const thumb =
        video.thumbnailUrl ||
        (video.videoId
            ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
            : "");

    return (
        <div className="saved-video-card">
            <a href={video.youtubeUrl} target="_blank" rel="noreferrer">
                <img
                    src={thumb}
                    alt={video.title}
                    className="saved-video-thumb"
                    onError={(e) => { e.target.style.display = "none"; }}
                />
            </a>
            <div className="saved-video-info">
                <p className="saved-video-title">{video.title}</p>
                <span className="saved-video-date">
                    Liked{" "}
                    {new Date(video.likedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    })}
                </span>
            </div>
            <button
                className="saved-video-unlike"
                onClick={handleUnlike}
                disabled={unliking}
                title="Remove from liked"
            >
                <HeartFill size={14} color="#e74c3c" />
            </button>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const SavedPlans = () => {
    const [activeTab, setActiveTab] = useState("diet");
    const [dietPlans, setDietPlans] = useState([]);
    const [exercisePlans, setExercisePlans] = useState([]);
    const [likedVideos, setLikedVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [diet, exercise, videos] = await Promise.all([
                    api.getDietPlans().catch(() => []),
                    api.getExercisePlans().catch(() => []),
                    api.getLikedVideos().catch(() => []),
                ]);
                setDietPlans(Array.isArray(diet) ? diet : []);
                setExercisePlans(Array.isArray(exercise) ? exercise : []);
                setLikedVideos(Array.isArray(videos) ? videos : []);
            } catch (e) {
                console.error("Failed to load saved data:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const handleUnlike = (videoId) => {
        setLikedVideos((prev) => prev.filter((v) => v.videoId !== videoId));
    };

    return (
        <>
            <NavBar />
            <div className="saved-page">
                <Container>
                    {/* ── Header ── */}
                    <div className="saved-header">
                        <h1 className="saved-heading">
                            My <span className="saved-heading-gradient">Saved Content</span>
                        </h1>
                        <p className="saved-subheading">
                            Your personalized diet plans, workout routines, and liked videos — all in one place.
                        </p>
                    </div>

                    {/* ── Tabs ── */}
                    <div className="saved-tabs">
                        <TabBtn
                            active={activeTab === "diet"}
                            onClick={() => setActiveTab("diet")}
                            icon={<span style={{ fontSize: 16 }}>🥗</span>}
                            label="Diet Plans"
                            count={dietPlans.length}
                        />
                        <TabBtn
                            active={activeTab === "exercise"}
                            onClick={() => setActiveTab("exercise")}
                            icon={<span style={{ fontSize: 16 }}>💪</span>}
                            label="Workout Plans"
                            count={exercisePlans.length}
                        />
                        <TabBtn
                            active={activeTab === "videos"}
                            onClick={() => setActiveTab("videos")}
                            icon={
                                <HeartFill
                                    size={14}
                                    color={activeTab === "videos" ? "#e74c3c" : "#888"}
                                />
                            }
                            label="Liked Videos"
                            count={likedVideos.length}
                        />
                    </div>

                    {/* ── Content ── */}
                    {loading ? (
                        <div className="saved-loading">
                            <div className="saved-spinner" />
                            <p>Loading your saved content...</p>
                        </div>
                    ) : (
                        <>
                            {/* Diet Plans */}
                            {activeTab === "diet" && (
                                <div className="saved-list">
                                    {dietPlans.length === 0 ? (
                                        <EmptyState
                                            icon="🥗"
                                            message="No diet plans saved yet"
                                            hint='Ask the chatbot "Give me a weekly diet plan" then click 💾 Save'
                                        />
                                    ) : (
                                        dietPlans.map((plan) => (
                                            <DietPlanCard key={plan.id} plan={plan} />
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Workout Plans */}
                            {activeTab === "exercise" && (
                                <div className="saved-list">
                                    {exercisePlans.length === 0 ? (
                                        <EmptyState
                                            icon="💪"
                                            message="No workout plans saved yet"
                                            hint='Ask the chatbot "Create a 3-day workout split" then click 💾 Save'
                                        />
                                    ) : (
                                        exercisePlans.map((plan) => (
                                            <ExercisePlanCard key={plan.id} plan={plan} />
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Liked Videos */}
                            {activeTab === "videos" && (
                                <div>
                                    {likedVideos.length === 0 ? (
                                        <EmptyState
                                            icon="❤️"
                                            message="No liked videos yet"
                                            hint='Ask the chatbot "Show me a workout video" then click ❤️ on any video'
                                        />
                                    ) : (
                                        <Row>
                                            {likedVideos.map((video) => (
                                                <Col
                                                    key={video.videoId}
                                                    xs={12}
                                                    sm={6}
                                                    md={4}
                                                    lg={3}
                                                    className="mb-4"
                                                >
                                                    <LikedVideoCard
                                                        video={video}
                                                        onUnlike={handleUnlike}
                                                    />
                                                </Col>
                                            ))}
                                        </Row>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </Container>
            </div>
        </>
    );
};

export default SavedPlans;