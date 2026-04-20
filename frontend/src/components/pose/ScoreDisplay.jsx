// src/components/pose/ScoreDisplay.jsx
export default function ScoreDisplay({ score, repCount }) {
  const color = score >= 80 ? "#28a745" : score >= 50 ? "#ffc107" : "#dc3545";
  const label = score >= 80 ? "Excellent" : score >= 50 ? "Needs Work" : "Incorrect";

  return (
    <div style={{
      textAlign: "center", padding: 24,
      background: "#fff", borderRadius: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.1)"
    }}>
      {/* Circular score */}
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={60} fill="none" stroke="#eee" strokeWidth={12} />
        <circle
          cx={70} cy={70} r={60} fill="none"
          stroke={color} strokeWidth={12}
          strokeDasharray={`${(score / 100) * 376.99} 376.99`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
        <text x={70} y={65} textAnchor="middle" fontSize={32} fontWeight="bold" fill={color}>
          {score}
        </text>
        <text x={70} y={85} textAnchor="middle" fontSize={12} fill="#666">
          / 100
        </text>
      </svg>

      <p style={{ margin: "8px 0 0", fontWeight: 700, color, fontSize: 18 }}>{label}</p>

      <div style={{ marginTop: 16, padding: "12px 0", borderTop: "1px solid #eee" }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#333" }}>{repCount}</div>
        <div style={{ color: "#666", fontSize: 14 }}>Repetitions</div>
      </div>
    </div>
  );
}