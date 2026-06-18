// src/components/ChatBot.js
import React, { useState, useEffect, useRef } from "react";
import { Card, InputGroup, Form, Button } from "react-bootstrap";
import { SendFill, Robot, PersonFill, ArrowsAngleExpand } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { sendMessage } from "../store/chatThunks";
import { setUserProfile, createSession, selectActiveMessages } from "../store/chatSlice";
import { api } from "../services/api";
import VideoPanel from "./VideoPanel";
import FormattedMessage from "./FormattedMessage";
import "./ChatBot.css";

const TypingIndicator = () => (
    <div className="d-flex mb-3 justify-content-start">
        <div
            style={{
                width: 40, height: 40, borderRadius: "50%",
                backgroundColor: "rgba(126,58,228,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
        >
            <Robot color="#a975ff" size={20} />
        </div>
        <div className="typing-bubble ms-2">
            <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
    </div>
);

const ChatBot = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const messages = useSelector(selectActiveMessages);
    const { isLoading, userProfile } = useSelector((s) => s.chat);
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!userProfile) {
            api.getProfile().then((p) => { if (p) dispatch(setUserProfile(p)); });
        }
    }, [dispatch, userProfile]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        dispatch(sendMessage(input));
        setInput("");
    };

    return (
        <section id="chatbot" style={{ paddingTop: "60px", backgroundColor: "#0e0413ff", color: "#fff", minHeight: "100vh" }}>
            <div className="container text-center mb-4">
                <h1 style={{ fontWeight: 700, fontSize: "3.5rem" }}>
                    AI{" "}
                    <span style={{ background: "linear-gradient(45deg,#7e3ae4,#b46cff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Fitness Assistant
                    </span>
                </h1>

                {userProfile && (
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        backgroundColor: "rgba(126,58,228,0.15)", border: "1px solid rgba(126,58,228,0.3)",
                        borderRadius: "20px", padding: "6px 16px", marginBottom: "10px",
                    }}>
                        <Robot size={13} color="#b46cff" />
                        <span style={{ fontSize: "13px", color: "#b46cff" }}>
                            Personalized · {userProfile.gender}, {userProfile.age} yrs · BMI {userProfile.bmiValue?.toFixed(1)}
                        </span>
                    </div>
                )}

                <p style={{ fontSize: "18px", color: "rgba(220,220,220,0.85)", maxWidth: "800px", margin: "10px auto 20px" }}>
                    Get instant answers to your fitness questions, personalized workout plans, and nutrition advice.
                </p>
            </div>

            <div className="d-flex justify-content-center flex-column align-items-center">
                <div style={{ width: "100%", maxWidth: "850px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Button variant="link" onClick={() => dispatch(createSession())} style={{ color: "#666", fontSize: "12px", textDecoration: "none", padding: 0 }}>
                        + New Chat
                    </Button>
                    <Button
                        variant="outline-light"
                        onClick={() => navigate("/echatbot")}
                        style={{ borderColor: "#7e3ae4", color: "#b46cff", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px", padding: "8px 15px", backgroundColor: "rgba(126,58,228,0.1)" }}
                    >
                        <ArrowsAngleExpand size={16} />
                        Full Screen
                    </Button>
                </div>

                <Card className="chat-card shadow-lg" style={{ backgroundColor: "#0d0616", color: "#fff", borderRadius: "20px", width: "100%", maxWidth: "850px", border: "1px solid #2c1a4b" }}>
                    <Card.Body style={{ height: "500px", overflowY: "auto", padding: "20px" }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`d-flex mb-3 flex-column ${msg.sender === "user" ? "align-items-end" : "align-items-start"}`}
                            >
                                <div className={`d-flex ${msg.sender === "user" ? "justify-content-end" : "justify-content-start"}`}>
                                    {msg.sender === "bot" && (
                                        <div style={{
                                            width: 40, height: 40, borderRadius: "50%",
                                            backgroundColor: "rgba(126,58,228,0.2)",
                                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                                        }}>
                                            <Robot color="#a975ff" size={20} />
                                        </div>
                                    )}

                                    <div
                                        className="p-3 rounded-4 mx-2"
                                        style={{
                                            backgroundColor: msg.isError
                                                ? "rgba(200,50,50,0.2)"
                                                : msg.sender === "user"
                                                    ? "#7e3ae4"
                                                    : "rgba(60,40,80,0.9)",
                                            color: "#fff",
                                            maxWidth: "70%",
                                            lineHeight: "1.6",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {msg.sender === "user" ? (
                                            <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
                                        ) : (
                                            // ✅ planType passed here
                                            <FormattedMessage text={msg.text} planType={msg.planType || null} />
                                        )}
                                    </div>

                                    {msg.sender === "user" && (
                                        <div style={{
                                            width: 40, height: 40, borderRadius: "50%",
                                            backgroundColor: "rgba(180,108,255,0.2)",
                                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                                        }}>
                                            <PersonFill color="#b46cff" size={20} />
                                        </div>
                                    )}
                                </div>

                                {msg.sender === "bot" && msg.videos && (
                                    <div style={{ maxWidth: "70%", marginLeft: "52px" }}>
                                        <VideoPanel videos={msg.videos} videoMessage={msg.videoMessage} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && <TypingIndicator />}
                        <div ref={bottomRef} />
                    </Card.Body>

                    <Card.Footer className="p-3" style={{ backgroundColor: "#12091f", borderTop: "1px solid #2c1a4b", borderRadius: "0 0 20px 20px" }}>
                        <InputGroup>
                            <Form.Control
                                type="text"
                                placeholder="Ask about workouts, diet, exercises..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                disabled={isLoading}
                                style={{ backgroundColor: "#1a1027", color: "#fff", border: "1px solid #2c1a4b", borderRadius: "12px" }}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                style={{ backgroundColor: isLoading ? "#4a2288" : "#7e3ae4", border: "none", borderRadius: "12px", marginLeft: "8px", padding: "10px 18px" }}
                            >
                                <SendFill size={18} />
                            </Button>
                        </InputGroup>
                    </Card.Footer>
                </Card>
            </div>
        </section>
    );
};

export default ChatBot;