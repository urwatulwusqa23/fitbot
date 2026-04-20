// src/components/FormattedMessage.jsx
import ReactMarkdown from "react-markdown";

export default function FormattedMessage({ text }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h3 style={{
            color: "#b46cff", fontWeight: 700,
            margin: "10px 0 6px", fontSize: 16
          }}>
            {children}
          </h3>
        ),
        h2: ({ children }) => (
          <h4 style={{
            color: "#b46cff", fontWeight: 600,
            margin: "8px 0 4px", fontSize: 15
          }}>
            {children}
          </h4>
        ),
        h3: ({ children }) => (
          <h5 style={{
            color: "#d4a8ff", fontWeight: 600,
            margin: "6px 0 4px", fontSize: 14
          }}>
            {children}
          </h5>
        ),
        p: ({ children }) => (
          <p style={{
            margin: "4px 0", fontSize: 14,
            color: "#e0e0e0", lineHeight: 1.7
          }}>
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul style={{
            paddingLeft: 18, margin: "6px 0",
            listStyleType: "disc"
          }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ paddingLeft: 18, margin: "6px 0" }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{
            marginBottom: 3, color: "#e0e0e0",
            fontSize: 14, lineHeight: 1.6
          }}>
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong style={{ color: "#b46cff", fontWeight: 700 }}>
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em style={{ color: "#d4a8ff" }}>{children}</em>
        ),
        code: ({ children }) => (
          <code style={{
            background: "rgba(180,108,255,0.15)",
            color: "#b46cff", borderRadius: 4,
            padding: "1px 6px", fontSize: 13,
            fontFamily: "monospace"
          }}>
            {children}
          </code>
        ),
        hr: () => (
          <hr style={{
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            margin: "8px 0"
          }} />
        ),
      }}
    >
      {text ?? ""}
    </ReactMarkdown>
  );
}