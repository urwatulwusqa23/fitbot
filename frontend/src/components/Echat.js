// src/components/EChat.js
import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Form, InputGroup, Button } from "react-bootstrap";
import { SendFill, Robot, PersonFill, Trash } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import { sendMessage } from "../store/chatThunks";
import { setUserProfile, createSession, selectActiveMessages, selectActiveSession } from "../store/chatSlice";
import { api } from "../services/api";
import FormattedMessage from "./FormattedMessage";
import Sidebar from "./Sidebar";
import VideoPanel from "./VideoPanel";
import "./EChatbot.css";

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <div className="d-flex align-items-end mb-4" style={{ gap: "10px" }}>
        <div className="bot-avatar-sm">
            <Robot size={16} color="#b46cff" />
        </div>
        <div className="typing-bubble-echat">
            <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
    </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
    const isUser = msg.sender === "user";
    return (
        <div className={`echat-message-row ${isUser ? "user-row" : "bot-row"}`}>
            {!isUser && (
                <div className="bot-avatar-sm">
                    <Robot size={16} color="#b46cff" />
                </div>
            )}
            <div className={`echat-bubble ${isUser ? "user-bubble" : "bot-bubble"} ${msg.isError ? "error-bubble" : ""}`}>
                {isUser ? (
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                        {msg.text}
                    </p>
                ) : (
                    // ✅ planType passed here
                    <FormattedMessage text={msg.text} planType={msg.planType || null} />
                )}
                {msg.source && msg.source !== "ai" && msg.source !== "openai" && (
                    <span className="source-tag">via {msg.source}</span>
                )}
            </div>
            {isUser && (
                <div className="user-avatar-sm">
                    <PersonFill size={16} color="#7e3ae4" />
                </div>
            )}
        </div>
    );
};

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
    { label: "💪 3-Day Workout Split", prompt: "Create a personalized 3-day workout split for me based on my profile." },
    { label: "🥗 Weekly Diet Plan", prompt: "Give me a full personalized weekly diet plan based on my health profile and target weight." },
    { label: "📈 Progressive Overload", prompt: "Explain progressive overload and how I should apply it to my level." },
    { label: "🧘 Back Pain Yoga", prompt: "Suggest a yoga routine specifically for back pain relief I can do at home." },
    { label: "🔥 20-Min HIIT Cardio", prompt: "Design a 20-minute HIIT cardio session for fat loss." },
    { label: "🍗 High-Protein Meals", prompt: "Suggest 5 high-protein meal ideas that fit my fitness goals." },
    { label: "😴 Recovery Tips", prompt: "What are the best recovery strategies to reduce muscle soreness?" },
    { label: "⚖️ BMI Roadmap", prompt: "Analyze my current BMI and give me a roadmap to reach my target weight." },
];

// ── Main component ────────────────────────────────────────────────────────────
const Echat = () => {
    const dispatch = useDispatch();
    const messages = useSelector(selectActiveMessages);
    const activeSession = useSelector(selectActiveSession);
    const { isLoading, userProfile } = useSelector((s) => s.chat);

    const [input, setInput] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(260);

    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!userProfile) {
            api.getProfile().then((p) => { if (p) dispatch(setUserProfile(p)); });
        }
    }, [dispatch, userProfile]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height =
                Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [input]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        dispatch(sendMessage(input));
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const showWelcome = messages.length <= 1;

    return (
        <div className="echatbot-container">
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                width={sidebarWidth}
                setWidth={setSidebarWidth}
            />

            <div className="main-chat-area">
                {/* ── Fixed header ──────────────────────────────────────────────────── */}
                <div className="chat-header-fixed">
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="chatbot-icon-badge">
                            <Robot size={24} color="#b46cff" />
                        </div>

                        {activeSession && (
                            <span className="session-name-label">
                                {activeSession.title}
                            </span>
                        )}

                        {userProfile && (
                            <div className="profile-pill">
                                {userProfile.gender}, {userProfile.age} yrs · {userProfile.weight} kg ·{" "}
                                BMI <strong>{userProfile.bmiValue?.toFixed(1)}</strong>
                            </div>
                        )}
                    </div>

                    <Button
                        variant="link"
                        onClick={() => dispatch(createSession())}
                        title="New Chat"
                        style={{ color: "#666", padding: "0 20px", marginLeft: "auto" }}
                    >
                        <Trash size={18} />
                    </Button>
                </div>

                {/* ── Scrollable messages ───────────────────────────────────────────── */}
                <div className="chat-content-scroll-wrapper">
                    <Container className="chat-display d-flex flex-column align-items-center">

                        {showWelcome && (
                            <div className="text-center mb-4 mt-4 welcome-section">
                                <h1 className="gradient-text">
                                    {userProfile ? "Hello, Champion 👋" : "Hello, Fitness Enthusiast"}
                                </h1>
                                <h3
                                    className="text-muted"
                                    style={{ fontWeight: 400, fontSize: "1.15rem", marginTop: "8px" }}
                                >
                                    {userProfile
                                        ? `Let's crush your goals — target: ${userProfile.targetWeight} kg`
                                        : "How can I help you today?"}
                                </h3>

                                <Row
                                    className="w-100 mt-4 justify-content-center"
                                    style={{ maxWidth: "800px", margin: "0 auto" }}
                                >
                                    {SUGGESTIONS.map((s, i) => (
                                        <Col md={3} xs={6} key={i} className="mb-3">
                                            <div
                                                className="suggestion-card"
                                                onClick={() => !isLoading && dispatch(sendMessage(s.prompt))}
                                                style={{ opacity: isLoading ? 0.5 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
                                            >
                                                {s.label}
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}

                        {/* ── Messages ─────────────────────────────────────────────────── */}
                        <div className="messages-wrapper">
                            {messages.map((msg) => (
                                <div key={msg.id}>
                                    <MessageBubble msg={msg} />

                                    {msg.sender === "bot" && msg.videos && (
                                        <div className="video-panel-echat-wrapper">
                                            <VideoPanel
                                                videos={msg.videos}
                                                videoMessage={msg.videoMessage}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && <TypingIndicator />}
                            <div ref={bottomRef} />
                        </div>
                    </Container>
                </div>

                {/* ── Input ─────────────────────────────────────────────────────────── */}
                <div className="input-area-wrapper">
                    <Container className="mw-800 p-0">
                        <InputGroup className="echat-input-group">
                            <Form.Control
                                as="textarea"
                                ref={textareaRef}
                                placeholder="Ask anything about fitness…"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKey}
                                disabled={isLoading}
                                rows={1}
                                style={{ resize: "none", overflow: "hidden" }}
                            />
                            <Button
                                variant="link"
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                style={{
                                    opacity: !input.trim() || isLoading ? 0.35 : 1,
                                    transition: "opacity 0.2s",
                                }}
                            >
                                <SendFill color="#b46cff" size={20} />
                            </Button>
                        </InputGroup>
                        <p className="disclaimer mt-2">
                            FitBot AI can make mistakes. Always consult a professional for medical advice.
                        </p>
                    </Container>
                </div>
            </div>
        </div>
    );
};

export default Echat;