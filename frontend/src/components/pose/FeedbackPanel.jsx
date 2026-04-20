// src/components/pose/FeedbackPanel.jsx
export default function FeedbackPanel({ feedback }) {
  const colors = {
    success: { bg: "#d4edda", border: "#28a745", text: "#155724", icon: "✅" },
    warning: { bg: "#fff3cd", border: "#ffc107", text: "#856404", icon: "⚠️" },
    error:   { bg: "#f8d7da", border: "#dc3545", text: "#721c24", icon: "❌" },
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.1)", padding: 20
    }}>
      <h3 style={{ margin: "0 0 14px" }}>Live Feedback</h3>
      {feedback.map((item, i) => {
        const style = colors[item.severity] || colors.warning;
        return (
          <div key={i} style={{
            background: style.bg, border: `1px solid ${style.border}`,
            borderRadius: 8, padding: "10px 14px", marginBottom: 10,
            color: style.text, display: "flex", alignItems: "center", gap: 10
          }}>
            <span style={{ fontSize: 20 }}>{style.icon}</span>
            <span style={{ fontWeight: 600 }}>{item.message}</span>
          </div>
        );
      })}
    </div>
  );
}