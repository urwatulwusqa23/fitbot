// src/components/pose/PoseComparison.jsx
import { useCallback, useState, useEffect } from "react";
import { extractYouTubeId } from "./VideoSelector";
import UploadMode  from "./UploadMode";
import WebcamMode  from "./WebcamMode";

export default function PoseComparison({ referenceVideo }) {
  const [refMotion,   setRefMotion]   = useState(null);  // full motion pattern from DB
  const [loading,     setLoading]     = useState(false);
  const [loadingMsg,  setLoadingMsg]  = useState("");
  const [error,       setError]       = useState(null);
  const [mode,        setMode]        = useState(null);

  // ── When component mounts: fetch or trigger processing ──────────────────
  useEffect(() => {
    processReferenceVideo();
  }, [referenceVideo.id]);

  const processReferenceVideo = async () => {
    setLoading(true);
    setError(null);
    setLoadingMsg("Checking database for reference motion...");

    try {
      // Call .NET — it checks DB first, then calls Python if needed
      const res = await fetch("/api/motion/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId:      referenceVideo.id,
          youtubeUrl:   referenceVideo.link,
          exerciseName: referenceVideo.title,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Processing failed");
      }

      const data = await res.json();

      // Parse the frames JSON string into actual array
      const frames = typeof data.frames === "string"
        ? JSON.parse(data.frames)
        : data.frames;

      const motionPattern = typeof data.motionPattern === "string"
        ? JSON.parse(data.motionPattern)
        : data.motionPattern;

      setRefMotion({ ...data, frames, motionPattern });
      setLoadingMsg("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ytId = extractYouTubeId(referenceVideo.link);

  return (
    <div style={{ color: "#fff" }}>
      <h2 style={{ marginBottom: 4 }}>{referenceVideo.title}</h2>

      {/* ── Loading state ── */}
      {loading && (
        <div style={{
          background: "rgba(180,108,255,0.1)",
          border: "1px solid #b46cff",
          borderRadius: 10, padding: 20,
          textAlign: "center", marginBottom: 16
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ color: "#b46cff", fontWeight: 600 }}>
            Analyzing reference exercise...
          </div>
          <div style={{ color: "#aaa", fontSize: 13, marginTop: 6 }}>
            First time only — downloading and extracting pose from every
            frame of the exercise video. This takes 1–3 minutes.
            Next time it will be instant.
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div style={{
          background: "rgba(255,77,77,0.1)",
          border: "1px solid #ff4d4d",
          borderRadius: 10, padding: 16, marginBottom: 16
        }}>
          <div style={{ color: "#ff4d4d", fontWeight: 600 }}>
            ❌ Processing failed
          </div>
          <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>
            {error}
          </div>
          <button
            onClick={processReferenceVideo}
            style={{
              marginTop: 10, padding: "6px 16px",
              background: "#ff4d4d", color: "#fff",
              border: "none", borderRadius: 6, cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Success: show video + mode picker ── */}
      {refMotion && !loading && (
        <>
          {/* Success banner */}
          <div style={{
            background: "rgba(40,167,69,0.1)",
            border: "1px solid #28a745",
            borderRadius: 8, padding: "8px 14px",
            marginBottom: 16, fontSize: 13, color: "#28a745"
          }}>
            ✅ Reference motion loaded —{" "}
            <strong>{refMotion.frames?.length ?? 0} frames</strong> analyzed
            from the exercise video. Ready to compare your form.
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24
          }}>

            {/* ── Left: reference video ── */}
            <div>
              <h3 style={{ marginBottom: 8 }}>Reference video</h3>
              <iframe
                width="100%" height="280"
                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                title={referenceVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media"
                allowFullScreen
                style={{ borderRadius: 8, border: "none", display: "block" }}
              />
              <div style={{
                marginTop: 10, padding: "10px 14px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 8, fontSize: 12, color: "#aaa"
              }}>
                The system has analyzed the full motion of this video.
                Your form will be compared against every frame of this exercise.
              </div>
            </div>

            {/* ── Right: mode picker ── */}
            <div>
              {!mode && (
                <div>
                  <h3 style={{ marginBottom: 12 }}>
                    How do you want to practice?
                  </h3>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12
                  }}>
                    <button
                      onClick={() => setMode("upload")}
                      style={{
                        padding: "20px", borderRadius: 10,
                        border: "2px solid #b46cff",
                        background: "rgba(180,108,255,0.1)",
                        cursor: "pointer", textAlign: "left", color: "#fff"
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        🎬 Upload my video
                      </div>
                      <div style={{
                        fontSize: 13, color: "#aaa", marginTop: 6
                      }}>
                        Record yourself doing this exercise, upload it.
                        Every wrong frame gets red dot/line overlays.
                        Summary at the end shows your worst moments
                        side-by-side with the correct pose.
                      </div>
                    </button>

                    <button
                      onClick={() => setMode("webcam")}
                      style={{
                        padding: "20px", borderRadius: 10,
                        border: "2px solid #28a745",
                        background: "rgba(40,167,69,0.1)",
                        cursor: "pointer", textAlign: "left", color: "#fff"
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        📷 Use live webcam
                      </div>
                      <div style={{
                        fontSize: 13, color: "#aaa", marginTop: 6
                      }}>
                        Real-time skeleton overlay with green/red joints,
                        voice coaching, live score, and rep counter
                        as you perform the exercise.
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {mode === "upload" && (
                <div>
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: 10, marginBottom: 12
                  }}>
                    <h3 style={{ margin: 0 }}>Upload your video</h3>
                    <button
                      onClick={() => setMode(null)}
                      style={{
                        fontSize: 12, padding: "2px 10px",
                        borderRadius: 4,
                        border: "1px solid #555",
                        background: "transparent",
                        color: "#aaa", cursor: "pointer"
                      }}
                    >
                      ← Switch mode
                    </button>
                  </div>
                  <UploadMode refMotion={refMotion} />
                </div>
              )}

              {mode === "webcam" && (
                <div>
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: 10, marginBottom: 12
                  }}>
                    <h3 style={{ margin: 0 }}>Live webcam</h3>
                    <button
                      onClick={() => setMode(null)}
                      style={{
                        fontSize: 12, padding: "2px 10px",
                        borderRadius: 4,
                        border: "1px solid #555",
                        background: "transparent",
                        color: "#aaa", cursor: "pointer"
                      }}
                    >
                      ← Switch mode
                    </button>
                  </div>
                  <WebcamMode refMotion={refMotion} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}