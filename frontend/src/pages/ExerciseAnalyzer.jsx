// src/pages/ExerciseAnalyzer.jsx
import { useState } from "react";
import VideoSelector from "../components/pose/VideoSelector";
import PoseComparison from "../components/pose/PoseComparison";

export default function ExerciseAnalyzer() {
  const [selectedVideo, setSelectedVideo] = useState(null);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>Exercise Analyzer</h1>
      <p style={{ color: "#666" }}>
        Select an exercise, then perform it in front of your camera.
        Get real-time feedback on your form.
      </p>

      {!selectedVideo ? (
        <VideoSelector onSelect={setSelectedVideo} />
      ) : (
        <div>
          <button
            onClick={() => setSelectedVideo(null)}
            style={{ marginBottom: 16, padding: "6px 16px" }}
          >
            ← Back to exercise list
          </button>
          <PoseComparison referenceVideo={selectedVideo} />
        </div>
      )}
    </div>
  );
}