// src/components/pose/ScoreBreakdown.jsx
import { useState } from "react";

export default function ScoreBreakdown({ breakdown, finalScore }) {
  const [open, setOpen] = useState(false);

  const colors = {
    angle:     "#b46cff",
    dtw:       "#378ADD",
    embedding: "#1D9E75",
    velocity:  "#EF9F27",
    symmetry:  "#D85A30",
    phase:     "#D4537E",
  };

  const labels = {
    angle:     "Joint Angles",
    dtw:       "Motion Sequence (DTW)",
    embedding: "Body Shape",
    velocity:  "Movement Speed",
    symmetry:  "Left/Right Balance",
    phase:     "Exercise Phase",
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "10px 16px",
          background: "rgba(180,108,255,0.1)",
          border: "1px solid #b46cff",
          borderRadius: 8, color: "#b46cff",
          cursor: "pointer", fontWeight: 600,
          display: "flex", justifyContent: "space-between",
          alignItems: "center", fontSize: 14
        }}
      >
        <span>📊 Score Breakdown — {finalScore}% overall</span>
        <span>{open ? "▲ Hide" : "▼ Show details"}</span>
      </button>

      {open && breakdown && (
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderTop: "none", borderRadius: "0 0 8px 8px",
          padding: 16
        }}>
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 4, fontSize: 13
              }}>
                <span style={{ color: "#ccc" }}>
                  {labels[key]}
                  <span style={{
                    marginLeft: 8, fontSize: 11,
                    color: "#666"
                  }}>
                    (weight: {val.weight})
                  </span>
                </span>
                <span style={{
                  fontWeight: 700,
                  color: val.score >= 80 ? "#28a745"
                       : val.score >= 50 ? "#ffc107" : "#dc3545"
                }}>
                  {val.score}%
                </span>
              </div>

              {/* Score bar */}
              <div style={{
                height: 6, background: "#333",
                borderRadius: 3, overflow: "hidden", marginBottom: 4
              }}>
                <div style={{
                  width: `${val.score}%`, height: "100%",
                  borderRadius: 3,
                  background: colors[key],
                  transition: "width 0.5s ease"
                }} />
              </div>

              {/* Detail text */}
              <div style={{ fontSize: 11, color: "#666" }}>
                {val.detail}
              </div>
            </div>
          ))}

          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 10, marginTop: 4,
            fontSize: 12, color: "#888"
          }}>
            Final score = weighted average of all 6 techniques
          </div>
        </div>
      )}
    </div>
  );
}