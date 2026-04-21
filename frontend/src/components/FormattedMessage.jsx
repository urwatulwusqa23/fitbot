import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../services/api";

const SavePlanButton = ({ planType, planText }) => {
    const [status, setStatus] = useState("idle"); // idle | saving | saved | error

    if (!planType) return null;
    const token = localStorage.getItem("token");
    if (!token) return null;

    const handleSave = async () => {
        setStatus("saving");
        try {
            const planData = {
                title: planType === "diet"
                    ? `Diet Plan — ${new Date().toLocaleDateString()}`
                    : `Workout Plan — ${new Date().toLocaleDateString()}`,
                planType: planType === "diet" ? "weekly" : "custom",
                planJson: JSON.stringify({ content: planText }),
            };

            if (planType === "diet") {
                await api.saveDietPlan(planData);
            } else {
                await api.saveExercisePlan(planData);
            }
            setStatus("saved");
        } catch (err) {
            console.error("Save failed:", err);
            setStatus("error");
        }
    };

    return (
        <div style={{ marginTop: "12px" }}>
            {status === "idle" && (
                <button
                    onClick={handleSave}
                    style={{
                        backgroundColor: "rgba(126,58,228,0.2)",
                        border: "1px solid rgba(126,58,228,0.5)",
                        borderRadius: "8px",
                        color: "#b46cff",
                        padding: "6px 14px",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(126,58,228,0.35)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(126,58,228,0.2)";
                    }}
                >
                    💾 Save this {planType === "diet" ? "Diet" : "Workout"} Plan
                </button>
            )}
            {status === "saving" && (
                <span style={{ fontSize: "13px", color: "#888" }}>Saving...</span>
            )}
            {status === "saved" && (
                <span style={{ fontSize: "13px", color: "#4caf50" }}>
                    ✅ {planType === "diet" ? "Diet" : "Workout"} plan saved!
                </span>
            )}
            {status === "error" && (
                <span style={{ fontSize: "13px", color: "#e74c3c" }}>
                    ❌ Failed to save. Are you logged in?
                </span>
            )}
        </div>
    );
};

const FormattedMessage = ({ text, planType }) => {
    return (
        <div>
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
                                    color: "#e0d0ff",
                                }}
                                {...props}
                            />
                        </div>
                    ),
                    thead: ({ node, ...props }) => (
                        <thead
                            style={{ backgroundColor: "rgba(126,58,228,0.4)" }}
                            {...props}
                        />
                    ),
                    th: ({ node, ...props }) => (
                        <th
                            style={{
                                padding: "8px 12px",
                                border: "1px solid rgba(126,58,228,0.3)",
                                textAlign: "left",
                                fontWeight: 600,
                            }}
                            {...props}
                        />
                    ),
                    td: ({ node, ...props }) => (
                        <td
                            style={{
                                padding: "7px 12px",
                                border: "1px solid rgba(126,58,228,0.2)",
                            }}
                            {...props}
                        />
                    ),
                    tr: ({ node, ...props }) => (
                        <tr
                            style={{ backgroundColor: "transparent" }}
                            onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                                "rgba(126,58,228,0.1)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = "transparent")
                            }
                            {...props}
                        />
                    ),
                    p: ({ node, ...props }) => (
                        <p style={{ margin: "4px 0", lineHeight: 1.6 }} {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                        <ul style={{ paddingLeft: "18px", margin: "6px 0" }} {...props} />
                    ),
                    li: ({ node, ...props }) => (
                        <li style={{ margin: "3px 0" }} {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                        <strong style={{ color: "#b46cff" }} {...props} />
                    ),
                }}
            >
                {text}
            </ReactMarkdown>

            {/* Save button appears after diet or workout plan replies */}
            <SavePlanButton planType={planType} planText={text} />
        </div>
    );
};

export default FormattedMessage;