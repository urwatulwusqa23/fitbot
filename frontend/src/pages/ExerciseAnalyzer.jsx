// // src/pages/ExerciseAnalyzer.jsx
// import { useState } from "react";
// import VideoSelector from "../components/pose/VideoSelector";
// import PoseComparison from "../components/pose/PoseComparison";

// export default function ExerciseAnalyzer() {
//   const [selectedVideo, setSelectedVideo] = useState(null);

//   return (
//     <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
//       <h1>Exercise Analyzer</h1>
//       <p style={{ color: "#666" }}>
//         Select an exercise, then perform it in front of your camera.
//         Get real-time feedback on your form.
//       </p>

//       {!selectedVideo ? (
//         <VideoSelector onSelect={setSelectedVideo} />
//       ) : (
//         <div>
//           <button
//             onClick={() => setSelectedVideo(null)}
//             style={{ marginBottom: 16, padding: "6px 16px" }}
//           >
//             ← Back to exercise list
//           </button>
//           <PoseComparison referenceVideo={selectedVideo} />
//         </div>
//       )}
//     </div>
//   );
// }

// src/pages/ExerciseAnalyzer.jsx
import { useState } from "react";
import VideoSelector from "../components/pose/VideoSelector";
import PoseComparison from "../components/pose/PoseComparison";

const NAVBAR_HEIGHT = 64;

export default function ExerciseAnalyzer() {
  const [selectedVideo, setSelectedVideo] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500&display=swap');

        .ea-root * { box-sizing: border-box; }

        .ea-root {
          min-height: calc(100vh - ${NAVBAR_HEIGHT}px);
          margin-top: ${NAVBAR_HEIGHT}px;
          background: #07000f;
          font-family: 'Space Grotesk', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .ea-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .ea-orb-1 {
          width: 600px; height: 600px;
          top: -200px; left: -150px;
          background: radial-gradient(circle, rgba(109,40,217,0.45) 0%, transparent 70%);
          animation: orbDrift1 12s ease-in-out infinite alternate;
        }
        .ea-orb-2 {
          width: 500px; height: 500px;
          top: 100px; right: -180px;
          background: radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%);
          animation: orbDrift2 15s ease-in-out infinite alternate;
        }
        .ea-orb-3 {
          width: 300px; height: 300px;
          top: 380px; left: 40%;
          background: radial-gradient(circle, rgba(139,0,255,0.18) 0%, transparent 70%);
          animation: orbDrift1 18s ease-in-out infinite alternate-reverse;
        }

        @keyframes orbDrift1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes orbDrift2 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-30px, 20px) scale(1.05); }
        }

        .ea-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .ea-content {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 28px 60px;
        }

        .ea-hero {
          padding: 72px 0 56px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 40px;
          flex-wrap: wrap;
        }

        .ea-hero-left { flex: 1; min-width: 280px; }

        .ea-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #d8b4fe;
          background: rgba(139,92,246,0.12);
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 999px;
          padding: 6px 16px;
          margin-bottom: 22px;
        }
        .ea-badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #a855f7;
          box-shadow: 0 0 10px #a855f7, 0 0 20px rgba(168,85,247,0.5);
          animation: dotPulse 2.4s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(0.65); }
        }

        .ea-title {
          font-size: clamp(2.6rem, 5vw, 4rem);
          font-weight: 800;
          color: #faf5ff;
          margin: 0 0 6px;
          letter-spacing: -0.04em;
          line-height: 1.05;
        }
        .ea-title-purple {
          background: linear-gradient(135deg, #e879f9 0%, #a855f7 40%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ea-line {
          width: 56px; height: 3px;
          background: linear-gradient(90deg, #9333ea, #4c1d95 80%, transparent);
          border-radius: 2px;
          margin: 18px 0 22px;
        }

        .ea-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 1.05rem;
          color: #9c7fc4;
          line-height: 1.65;
          max-width: 480px;
          margin: 0;
        }

        .ea-stats {
          display: flex;
          gap: 12px;
          margin-top: 32px;
          flex-wrap: wrap;
        }
        .ea-stat {
          background: rgba(88,28,220,0.15);
          border: 1px solid rgba(139,92,246,0.25);
          border-radius: 12px;
          padding: 10px 18px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ea-stat-num {
          font-size: 1.4rem;
          font-weight: 700;
          color: #c084fc;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .ea-stat-label {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #7c5a9e;
          font-weight: 500;
          letter-spacing: 0.05em;
        }

        .ea-hero-card {
          width: 260px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(139,92,246,0.22);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(8px);
          align-self: flex-start;
          margin-top: 8px;
        }
        .ea-hero-card-title {
          font-size: 11px;
          font-weight: 700;
          color: #9333ea;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 0 0 16px;
        }
        .ea-feature-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(139,92,246,0.1);
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #c4b0e0;
        }
        .ea-feature-row:last-child { border-bottom: none; }
        .ea-feature-icon {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: rgba(139,92,246,0.18);
          border: 1px solid rgba(139,92,246,0.25);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 12px;
          color: #a78bfa;
          font-weight: 700;
        }

        .ea-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.35) 30%, rgba(139,92,246,0.35) 70%, transparent);
          margin: 0 0 40px;
        }

        .ea-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 22px;
          margin-bottom: 28px;
          background: rgba(109,40,217,0.12);
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 12px;
          color: #c084fc;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: all 0.22s ease;
        }
        .ea-back-btn:hover {
          border-color: rgba(192,132,252,0.55);
          color: #e9d5ff;
          transform: translateX(-3px);
          background: rgba(109,40,217,0.22);
          box-shadow: 0 0 20px rgba(139,92,246,0.18);
        }
        .ea-back-btn:active { transform: translateX(-5px) scale(0.98); }

        .ea-section-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ea-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #e9d5ff;
          letter-spacing: -0.01em;
        }
        .ea-section-pill {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: #7c5a9e;
          background: rgba(88,28,220,0.1);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 999px;
          padding: 4px 13px;
        }
      `}</style>

      <div className="ea-root">
        <div className="ea-orb ea-orb-1" />
        <div className="ea-orb ea-orb-2" />
        <div className="ea-orb ea-orb-3" />
        <div className="ea-grid" />

        <div className="ea-content">
          {/* HERO */}
          <div className="ea-hero">
            <div className="ea-hero-left">
              <div className="ea-badge">
                <span className="ea-badge-dot" />
                AI-Powered · Real-time
              </div>

              <h1 className="ea-title">
                Exercise{" "}
                <span className="ea-title-purple">Analyzer</span>
              </h1>

              <div className="ea-line" />

              <p className="ea-subtitle">
                Select an exercise, then perform it in front of your camera.
                Get real-time feedback on your form powered by pose detection.
              </p>

              <div className="ea-stats">
                <div className="ea-stat">
                  <span className="ea-stat-num">33+</span>
                  <span className="ea-stat-label">Exercises</span>
                </div>
                <div className="ea-stat">
                  <span className="ea-stat-num">Live</span>
                  <span className="ea-stat-label">Feedback</span>
                </div>
                <div className="ea-stat">
                  <span className="ea-stat-num">AI</span>
                  <span className="ea-stat-label">Pose Model</span>
                </div>
              </div>
            </div>

            {!selectedVideo && (
              <div className="ea-hero-card">
                <p className="ea-hero-card-title">How it works</p>
                <div className="ea-feature-row">
                  <div className="ea-feature-icon">1</div>
                  Pick an exercise below
                </div>
                <div className="ea-feature-row">
                  <div className="ea-feature-icon">2</div>
                  Allow camera access
                </div>
                <div className="ea-feature-row">
                  <div className="ea-feature-icon">3</div>
                  Follow the reference video
                </div>
                <div className="ea-feature-row">
                  <div className="ea-feature-icon">4</div>
                  Get instant form scores
                </div>
              </div>
            )}
          </div>

          <div className="ea-divider" />

          {/* MAIN CONTENT */}
          {!selectedVideo ? (
            <>
              <div className="ea-section-hd">
                <span className="ea-section-title">Choose your exercise</span>
                <span className="ea-section-pill">Browse all →</span>
              </div>
              <VideoSelector onSelect={setSelectedVideo} />
            </>
          ) : (
            <div>
              <button
                className="ea-back-btn"
                onClick={() => setSelectedVideo(null)}
              >
                ← Back to exercise list
              </button>
              <PoseComparison referenceVideo={selectedVideo} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}