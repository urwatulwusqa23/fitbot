// // src/components/pose/WebcamMode.jsx
// import { useEffect, useRef, useState, useCallback } from "react";
// import { usePoseDetector } from "../../hooks/usePoseDetector";
// import {
//   keypointsToMap, extractAngles, normalizePose,
//   compareAgainstMotion, generateFeedback, drawSkeleton, createRepCounter
// } from "../../utils/poseUtils";

// const VOICE_COOLDOWN_MS = 4000;

// export default function WebcamMode({ refMotion }) {
//   const { ready, detectPose } = usePoseDetector();

//   const webcamRef     = useRef(null);
//   const canvasRef     = useRef(null);
//   const screenshotRef = useRef(null);
//   const rafRef        = useRef(null);
//   const repCounter    = useRef(null);
//   const lastVoice     = useRef({ msg: "", ts: 0 });
//   const lastErrorTime = useRef(-999);
//   const isRunningRef  = useRef(false);

//   const [active,      setActive]      = useState(false);
//   const [score,       setScore]       = useState(null);
//   const [feedback,    setFeedback]    = useState([]);
//   const [repCount,    setRepCount]    = useState(0);
//   const [status,      setStatus]      = useState("Start your camera to begin");
//   const [frameCount,  setFrameCount]  = useState(0);
//   const [frameErrors, setFrameErrors] = useState([]);
//   const [isFinished,  setIsFinished]  = useState(false);
//   const [allScores,   setAllScores]   = useState([]);

//   // ── Voice feedback ───────────────────────────────────────────────────────
//   const speak = useCallback((message) => {
//     if (!("speechSynthesis" in window)) return;
//     const now = Date.now();
//     if (lastVoice.current.msg === message &&
//         now - lastVoice.current.ts < VOICE_COOLDOWN_MS) return;
//     lastVoice.current = { msg: message, ts: now };
//     window.speechSynthesis.cancel();
//     const utter = new SpeechSynthesisUtterance(message);
//     utter.rate = 0.9;
//     window.speechSynthesis.speak(utter);
//   }, []);

//   // ── Capture screenshot ───────────────────────────────────────────────────
//   const captureErrorFrame = useCallback((kpMap, differences, msgs, frameScore) => {
//     try {
//       const webcam = webcamRef.current;
//       const sc     = screenshotRef.current;
//       if (!webcam || !sc) return null;
//       sc.width  = webcam.videoWidth;
//       sc.height = webcam.videoHeight;
//       const ctx = sc.getContext("2d");
//       ctx.save();
//       ctx.scale(-1, 1);
//       ctx.drawImage(webcam, -sc.width, 0, sc.width, sc.height);
//       ctx.restore();
//       ctx.fillStyle = "rgba(255,0,0,0.2)";
//       ctx.fillRect(0, 0, sc.width, sc.height);
//       drawSkeleton(ctx, kpMap, differences);
//       ctx.fillStyle = "rgba(0,0,0,0.65)";
//       ctx.fillRect(0, 0, sc.width, 38);
//       ctx.fillStyle = "#ff4444";
//       ctx.font      = "bold 15px Arial";
//       ctx.fillText("⚠ Form Error", 10, 26);
//       ctx.fillStyle = frameScore >= 50 ? "#ffc107" : "#dc3545";
//       ctx.fillRect(sc.width - 72, 6, 64, 26);
//       ctx.fillStyle = "#fff";
//       ctx.font      = "bold 14px Arial";
//       ctx.fillText(`${frameScore}%`, sc.width - 52, 24);
//       return sc.toDataURL("image/jpeg", 0.7);
//     } catch (e) {
//       return null;
//     }
//   }, []);

//   // ── Start webcam ─────────────────────────────────────────────────────────
//   const startWebcam = useCallback(async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { width: 640, height: 480, facingMode: "user" }
//       });
//       webcamRef.current.srcObject = stream;
//       await webcamRef.current.play();
//       repCounter.current = createRepCounter("left_knee_angle");
//       setActive(true);
//       setIsFinished(false);
//       setFrameErrors([]);
//       setAllScores([]);
//       setFrameCount(0);
//       setRepCount(0);
//       setScore(null);
//       setStatus("Perform the exercise!");
//       isRunningRef.current = true;
//       lastErrorTime.current = -999;
//     } catch {
//       setStatus("Camera access denied. Please allow camera permissions.");
//     }
//   }, []);

//   // ── Stop webcam ──────────────────────────────────────────────────────────
//   const stopWebcam = useCallback(() => {
//     webcamRef.current?.srcObject?.getTracks().forEach(t => t.stop());
//     cancelAnimationFrame(rafRef.current);
//     window.speechSynthesis?.cancel();
//     isRunningRef.current = false;
//     setActive(false);
//     setIsFinished(true);
//     setStatus("Session complete!");
//   }, []);

//   // ── Main rAF loop ────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!active || !refMotion?.frames || !ready) return;

//     let frameNum = 0;

//     const loop = async () => {
//       if (!isRunningRef.current) return;
//       frameNum++;

//       if (frameNum % 3 === 0) {
//         const keypoints = await detectPose(webcamRef.current);

//         if (keypoints && keypoints.length > 0) {
//           const kpMap      = keypointsToMap(keypoints);
//           const userAngles = extractAngles(normalizePose(kpMap));

//           if (Object.keys(userAngles).length > 0) {
//             const { differences, score: newScore } =
//               compareAgainstMotion(userAngles, refMotion.frames);

//             const newFeedback = generateFeedback(differences);
//             const reps        = repCounter.current?.(userAngles) ?? 0;
//             const hasError    = newFeedback.some(f => f.severity === "error");

//             // Draw skeleton
//             const canvas = canvasRef.current;
//             const ctx    = canvas?.getContext("2d");
//             if (ctx && canvas) {
//               canvas.width  = webcamRef.current.videoWidth;
//               canvas.height = webcamRef.current.videoHeight;
//               ctx.clearRect(0, 0, canvas.width, canvas.height);
//               drawSkeleton(ctx, kpMap, differences);
//             }

//             // Voice feedback
//             const worstError = newFeedback.find(f => f.severity === "error")
//                             || newFeedback.find(f => f.severity === "warning");
//             if (worstError && worstError.severity !== "success") {
//               speak(worstError.message);
//             }

//             // Capture error screenshot
//             if (hasError) {
//               const now = Date.now() / 1000;
//               if (now - lastErrorTime.current >= 2.0) {
//                 lastErrorTime.current = now;
//                 const errorMsgs = newFeedback
//                   .filter(f => f.severity === "error")
//                   .map(f => f.message);
//                 const screenshot = captureErrorFrame(
//                   kpMap, differences, errorMsgs, newScore
//                 );
//                 setFrameErrors(prev => [...prev, {
//                   time:       now,
//                   messages:   errorMsgs,
//                   score:      newScore,
//                   screenshot,
//                 }]);
//               }
//             }

//             setScore(newScore);
//             setAllScores(prev => [...prev, newScore]);
//             setFeedback(newFeedback);
//             setRepCount(reps);
//             setFrameCount(c => c + 1);

//             const worst = newFeedback.find(f => f.severity === "error")
//                        || newFeedback.find(f => f.severity === "warning");
//             setStatus(worst && worst.severity !== "success"
//               ? worst.message : "Great form!");
//           }
//         }
//       }

//       rafRef.current = requestAnimationFrame(loop);
//     };

//     rafRef.current = requestAnimationFrame(loop);
//     return () => {
//       cancelAnimationFrame(rafRef.current);
//     };
//   }, [active, refMotion, ready, detectPose, speak, captureErrorFrame]);

//   const formatTime = (s) => {
//     const date = new Date(s * 1000);
//     return `${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}`;
//   };

//   const avgScore = allScores.length > 0
//     ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
//     : 0;

//   return (
//     <div>
//       {/* Hidden screenshot canvas */}
//       <canvas ref={screenshotRef} style={{ display: "none" }} />

//       {/* Live webcam view */}
//       {!isFinished && (
//         <>
//           <div style={{
//             position: "relative", background: "#111",
//             borderRadius: 10, overflow: "hidden",
//             minHeight: 280, lineHeight: 0
//           }}>
//             <video
//               ref={webcamRef}
//               style={{
//                 width: "100%", display: "block",
//                 transform: "scaleX(-1)"
//               }}
//               muted playsInline
//             />
//             <canvas
//               ref={canvasRef}
//               style={{
//                 position: "absolute", top: 0, left: 0,
//                 width: "100%", height: "100%",
//                 pointerEvents: "none",
//                 transform: "scaleX(-1)"
//               }}
//             />

//             {/* Not started overlay */}
//             {!active && (
//               <div style={{
//                 position: "absolute", inset: 0,
//                 display: "flex", flexDirection: "column",
//                 alignItems: "center", justifyContent: "center",
//                 background: "rgba(0,0,0,0.7)", color: "#fff", gap: 12
//               }}>
//                 <span style={{ fontSize: 48 }}>📷</span>
//                 <span>Camera not started</span>
//               </div>
//             )}

//             {/* Live score badge */}
//             {active && score !== null && (
//               <div style={{
//                 position: "absolute", top: 12, right: 12,
//                 background: score >= 80 ? "#28a745"
//                            : score >= 50 ? "#ffc107" : "#dc3545",
//                 color: "#fff", borderRadius: 8,
//                 padding: "4px 12px", fontWeight: 700, fontSize: 18
//               }}>
//                 {score}%
//               </div>
//             )}

//             {/* Rep counter */}
//             {active && (
//               <div style={{
//                 position: "absolute", top: 12, left: 12,
//                 background: "rgba(0,0,0,0.6)", color: "#fff",
//                 borderRadius: 8, padding: "6px 12px"
//               }}>
//                 <div style={{ fontSize: 11, color: "#aaa" }}>REPS</div>
//                 <div style={{ fontSize: 24, fontWeight: 700 }}>{repCount}</div>
//               </div>
//             )}
//           </div>

//           {/* Status */}
//           {active && (
//             <div style={{
//               marginTop: 10, padding: "10px 14px",
//               background: "rgba(180,108,255,0.1)",
//               borderRadius: 8,
//               borderLeft: "4px solid #b46cff",
//               fontSize: 13, color: "#b46cff"
//             }}>
//               🔍 {status}
//               {frameCount > 0 && (
//                 <span style={{ marginLeft: 12, color: "#555", fontSize: 12 }}>
//                   {frameCount} frames analyzed
//                 </span>
//               )}
//             </div>
//           )}

//           {/* Live feedback pills */}
//           {active && feedback.length > 0 && (
//             <div style={{
//               display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10
//             }}>
//               {feedback.map((f, i) => (
//                 <span key={i} style={{
//                   padding: "4px 12px", borderRadius: 20,
//                   fontSize: 12, fontWeight: 600,
//                   background:
//                     f.severity === "success" ? "rgba(40,167,69,0.2)"
//                   : f.severity === "error"   ? "rgba(220,53,69,0.2)"
//                   :                           "rgba(255,193,7,0.2)",
//                   color:
//                     f.severity === "success" ? "#28a745"
//                   : f.severity === "error"   ? "#ff4444"
//                   :                           "#ffc107",
//                   border: `1px solid ${
//                     f.severity === "success" ? "#28a745"
//                   : f.severity === "error"   ? "#ff4444"
//                   :                           "#ffc107"}`
//                 }}>
//                   {f.message}
//                 </span>
//               ))}
//             </div>
//           )}

//           {/* Controls */}
//           <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
//             <button
//               onClick={startWebcam}
//               disabled={active || !refMotion?.frames || !ready}
//               style={{
//                 flex: 1, padding: "10px 0", borderRadius: 6,
//                 border: "none",
//                 background: active ? "#444" : "#b46cff",
//                 color: "#fff", fontWeight: 600,
//                 cursor: active ? "not-allowed" : "pointer"
//               }}
//             >
//               🎥 Start camera
//             </button>
//             <button
//               onClick={stopWebcam}
//               disabled={!active}
//               style={{
//                 flex: 1, padding: "10px 0", borderRadius: 6,
//                 border: "none",
//                 background: !active ? "#444" : "#dc3545",
//                 color: "#fff", fontWeight: 600,
//                 cursor: !active ? "not-allowed" : "pointer"
//               }}
//             >
//               ⏹ Stop &amp; see summary
//             </button>
//           </div>
//         </>
//       )}

//       {/* ── SUMMARY SCREEN (same as upload mode) ── */}
//       {isFinished && (
//         <WebcamSummary
//           avgScore={avgScore}
//           frameCount={frameCount}
//           repCount={repCount}
//           frameErrors={frameErrors}
//           formatTime={formatTime}
//           onReset={() => {
//             setIsFinished(false);
//             setActive(false);
//             setFrameErrors([]);
//             setAllScores([]);
//             setFrameCount(0);
//             setRepCount(0);
//             setScore(null);
//             setFeedback([]);
//             setStatus("Start your camera to begin");
//           }}
//         />
//       )}
//     </div>
//   );
// }

// // ── Webcam Summary ───────────────────────────────────────────────────────────
// function WebcamSummary({
//   avgScore, frameCount, repCount,
//   frameErrors, formatTime, onReset
// }) {
//   const [selected, setSelected] = useState(null);

//   return (
//     <div style={{
//       background: "rgba(255,255,255,0.03)",
//       borderRadius: 12, padding: 20,
//       border: "1px solid rgba(255,255,255,0.1)"
//     }}>
//       <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 20 }}>
//         📊 Session Summary
//       </h3>

//       {/* Score cards */}
//       <div style={{
//         display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
//         gap: 10, marginBottom: 20
//       }}>
//         {[
//           {
//             label: "Avg score", value: `${avgScore}%`,
//             color: avgScore >= 80 ? "#28a745" : avgScore >= 50 ? "#ffc107" : "#dc3545"
//           },
//           { label: "Frames analyzed", value: frameCount, color: "#b46cff" },
//           { label: "Reps counted",    value: repCount,   color: "#378ADD" },
//           {
//             label: "Form errors", value: frameErrors.length,
//             color: frameErrors.length === 0 ? "#28a745" : "#dc3545"
//           },
//         ].map((card, i) => (
//           <div key={i} style={{
//             background: "rgba(255,255,255,0.05)",
//             borderRadius: 10, padding: 12, textAlign: "center"
//           }}>
//             <div style={{ fontSize: 11, color: "#888" }}>{card.label}</div>
//             <div style={{
//               fontSize: 24, fontWeight: 700,
//               marginTop: 4, color: card.color
//             }}>
//               {card.value}
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Verdict */}
//       <div style={{
//         padding: "12px 16px", borderRadius: 8, marginBottom: 20,
//         background: avgScore >= 80
//           ? "rgba(40,167,69,0.15)" : "rgba(220,53,69,0.15)",
//         border: `1px solid ${avgScore >= 80 ? "#28a745" : "#dc3545"}`,
//         color: avgScore >= 80 ? "#28a745" : "#dc3545",
//         fontWeight: 600
//       }}>
//         {avgScore >= 80
//           ? `✅ Excellent session! ${repCount} reps with great form.`
//           : avgScore >= 50
//           ? `⚠️ Good effort! ${repCount} reps but some form issues to fix.`
//           : `❌ Form needs work. Review the error moments below and try again.`}
//       </div>

//       {/* Error screenshots */}
//       {frameErrors.length > 0 ? (
//         <div>
//           <h4 style={{ color: "#fff", margin: "0 0 12px" }}>
//             Moments where your form was incorrect:
//           </h4>

//           <div style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
//             gap: 10, marginBottom: 16
//           }}>
//             {frameErrors.map((err, i) => (
//               <div
//                 key={i}
//                 onClick={() => setSelected(err)}
//                 style={{
//                   cursor: "pointer", borderRadius: 8,
//                   overflow: "hidden", position: "relative",
//                   border: selected === err
//                     ? "2px solid #b46cff"
//                     : "2px solid rgba(220,53,69,0.5)"
//                 }}
//               >
//                 {err.screenshot ? (
//                   <img
//                     src={err.screenshot}
//                     alt={`Error ${i + 1}`}
//                     style={{ width: "100%", display: "block" }}
//                   />
//                 ) : (
//                   <div style={{
//                     width: "100%", paddingTop: "75%",
//                     background: "rgba(220,53,69,0.2)", position: "relative"
//                   }}>
//                     <span style={{
//                       position: "absolute", top: "50%", left: "50%",
//                       transform: "translate(-50%,-50%)",
//                       color: "#ff4444", fontSize: 24
//                     }}>⚠</span>
//                   </div>
//                 )}
//                 <div style={{
//                   position: "absolute", bottom: 0, left: 0, right: 0,
//                   background: "rgba(0,0,0,0.75)", padding: "3px 8px",
//                   display: "flex", justifyContent: "space-between"
//                 }}>
//                   <span style={{
//                     color: "#ff4444", fontSize: 11, fontWeight: 700
//                   }}>
//                     #{i + 1}
//                   </span>
//                   <span style={{
//                     color: err.score >= 50 ? "#ffc107" : "#dc3545",
//                     fontSize: 11, fontWeight: 700
//                   }}>
//                     {err.score}%
//                   </span>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Enlarged view */}
//           {selected && (
//             <div style={{
//               marginBottom: 16, borderRadius: 10, overflow: "hidden",
//               border: "1px solid #b46cff"
//             }}>
//               {selected.screenshot && (
//                 <img
//                   src={selected.screenshot}
//                   alt="Error detail"
//                   style={{ width: "100%", display: "block" }}
//                 />
//               )}
//               <div style={{ padding: "12px 16px" }}>
//                 {selected.messages.map((msg, i) => (
//                   <div key={i} style={{
//                     padding: "6px 10px", marginBottom: 4,
//                     background: "rgba(220,53,69,0.15)",
//                     borderLeft: "3px solid #dc3545",
//                     borderRadius: "0 6px 6px 0",
//                     color: "#ffaaaa", fontSize: 13
//                   }}>
//                     ❌ {msg}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       ) : (
//         <div style={{
//           padding: 20, textAlign: "center",
//           color: "#28a745", fontSize: 16
//         }}>
//           🎉 Perfect session! No form errors detected.
//         </div>
//       )}

//       <button
//         onClick={onReset}
//         style={{
//           marginTop: 16, padding: "10px 24px",
//           background: "#b46cff", color: "#fff",
//           border: "none", borderRadius: 8,
//           cursor: "pointer", fontWeight: 600
//         }}
//       >
//         Start new session
//       </button>
//     </div>
//   );
// }



// src/components/pose/WebcamMode.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { usePoseDetector } from "../../hooks/usePoseDetector";
import {
  keypointsToMap, extractAngles, normalizePose,
  compareAgainstMotion, drawSkeleton, createRepCounter,
  precomputeRefData, createSequenceBuffer, createVelocityTracker
} from "../../utils/poseUtils";
import ScoreBreakdown from "./ScoreBreakdown";

const VOICE_COOLDOWN_MS = 4000;

export default function WebcamMode({ refMotion }) {
  const { ready, detectPose } = usePoseDetector();

  const webcamRef      = useRef(null);
  const canvasRef      = useRef(null);
  const screenshotRef  = useRef(null);
  const rafRef         = useRef(null);
  const repCounter     = useRef(null);
  const lastVoice      = useRef({ msg: "", ts: 0 });
  const lastErrorTime  = useRef(-999);
  const isRunningRef   = useRef(false);

  // Precomputed per-session
  const refDataRef        = useRef(null);
  const userBufferRef     = useRef(null);
  const velocityTrackerRef = useRef(null);

  const [active,      setActive]      = useState(false);
  const [score,       setScore]       = useState(null);
  const [breakdown,   setBreakdown]   = useState(null);
  const [feedback,    setFeedback]    = useState([]);
  const [repCount,    setRepCount]    = useState(0);
  const [status,      setStatus]      = useState("Start your camera to begin");
  const [frameCount,  setFrameCount]  = useState(0);
  const [frameErrors, setFrameErrors] = useState([]);
  const [isFinished,  setIsFinished]  = useState(false);
  const [allScores,   setAllScores]   = useState([]);

  // Precompute reference data when refMotion loads
  useEffect(() => {
    if (!refMotion?.frames) return;
    refDataRef.current        = precomputeRefData(refMotion.frames);
    console.log("Webcam ref precomputed:",
      refDataRef.current.exerciseType,
      refDataRef.current.activeAngles.map(a => a.name)
    );
  }, [refMotion]);

  // ── Voice feedback ───────────────────────────────────────────────────────
  const speak = useCallback((message) => {
    if (!("speechSynthesis" in window)) return;
    const now = Date.now();
    if (
      lastVoice.current.msg === message &&
      now - lastVoice.current.ts < VOICE_COOLDOWN_MS
    ) return;
    lastVoice.current = { msg: message, ts: now };
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(message);
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  }, []);

  // ── Screenshot capture ───────────────────────────────────────────────────
  const captureErrorFrame = useCallback((kpMap, differences, msgs, frameScore) => {
    try {
      const webcam = webcamRef.current;
      const sc     = screenshotRef.current;
      if (!webcam || !sc) return null;
      sc.width  = webcam.videoWidth;
      sc.height = webcam.videoHeight;
      const ctx = sc.getContext("2d");
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(webcam, -sc.width, 0, sc.width, sc.height);
      ctx.restore();
      ctx.fillStyle = "rgba(255,0,0,0.2)";
      ctx.fillRect(0, 0, sc.width, sc.height);
      drawSkeleton(ctx, kpMap, differences);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, sc.width, 38);
      ctx.fillStyle = "#ff4444";
      ctx.font      = "bold 15px Arial";
      ctx.fillText("⚠ Form Error", 10, 26);
      ctx.fillStyle = frameScore >= 50 ? "#ffc107" : "#dc3545";
      ctx.fillRect(sc.width - 72, 6, 64, 26);
      ctx.fillStyle = "#fff";
      ctx.font      = "bold 14px Arial";
      ctx.fillText(`${frameScore}%`, sc.width - 52, 24);
      return sc.toDataURL("image/jpeg", 0.7);
    } catch (e) {
      return null;
    }
  }, []);

  // ── Start webcam ─────────────────────────────────────────────────────────
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      webcamRef.current.srcObject = stream;
      await webcamRef.current.play();

      // Reset trackers
      repCounter.current        = createRepCounter("left_knee_angle");
      userBufferRef.current     = createSequenceBuffer(40);
      velocityTrackerRef.current = createVelocityTracker();
      lastErrorTime.current     = -999;

      setActive(true);
      setIsFinished(false);
      setFrameErrors([]);
      setAllScores([]);
      setFrameCount(0);
      setRepCount(0);
      setScore(null);
      setBreakdown(null);
      setFeedback([]);
      setStatus("Perform the exercise!");
      isRunningRef.current = true;
    } catch {
      setStatus("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  // ── Stop webcam ──────────────────────────────────────────────────────────
  const stopWebcam = useCallback(() => {
    webcamRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(rafRef.current);
    window.speechSynthesis?.cancel();
    isRunningRef.current = false;
    setActive(false);
    setIsFinished(true);
    setStatus("Session complete!");
  }, []);

  // ── Main rAF loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !refMotion?.frames || !ready) return;

    const { activeAngles, refVelocities } = refDataRef.current ?? {
      activeAngles: [], refVelocities: {}
    };

    let frameNum = 0;

    const loop = async () => {
      if (!isRunningRef.current) return;
      frameNum++;

      if (frameNum % 3 === 0) {
        try {
          const keypoints = await detectPose(webcamRef.current);

          if (keypoints && keypoints.length > 0) {
            const kpMap      = keypointsToMap(keypoints);
            const normalized = normalizePose(kpMap);
            const userAngles = extractAngles(normalized);

            if (Object.keys(userAngles).length > 0) {
              // ── Run all 6 techniques ─────────────────────────────────────
              const result = compareAgainstMotion(
                userAngles,
                normalized,
                refMotion.frames,
                activeAngles,
                userBufferRef.current,
                velocityTrackerRef.current,
                refVelocities
              );

              const {
                finalScore, breakdown: bd,
                differences, wrongExercise, feedback: fb
              } = result;

              const reps = repCounter.current?.(userAngles) ?? 0;

              // ── Draw skeleton ────────────────────────────────────────────
              const canvas = canvasRef.current;
              const ctx    = canvas?.getContext("2d");
              if (ctx && canvas) {
                canvas.width  = webcamRef.current.videoWidth;
                canvas.height = webcamRef.current.videoHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawSkeleton(ctx, kpMap, differences);

                if (wrongExercise) {
                  ctx.fillStyle = "rgba(255,0,0,0.3)";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = "rgba(0,0,0,0.8)";
                  ctx.fillRect(0, 0, canvas.width, 44);
                  ctx.fillStyle = "#ff4444";
                  ctx.font      = "bold 15px Arial";
                  ctx.fillText("⛔ Wrong exercise!", 10, 28);
                }
              }

              // ── Voice ────────────────────────────────────────────────────
              if (wrongExercise) {
                speak("Wrong exercise. Please match the reference video.");
              } else {
                const worst = fb.find(f => f.severity === "error")
                           || fb.find(f => f.severity === "warning");
                if (worst && worst.severity !== "success") {
                  speak(worst.message);
                }
              }

              // ── Screenshot on error ──────────────────────────────────────
              const hasError = fb.some(f => f.severity === "error");
              if (hasError) {
                const now = Date.now() / 1000;
                if (now - lastErrorTime.current >= 2.0) {
                  lastErrorTime.current = now;
                  const errorMsgs = fb
                    .filter(f => f.severity === "error")
                    .map(f => f.message);
                  const screenshot = captureErrorFrame(
                    kpMap, differences, errorMsgs, finalScore
                  );
                  setFrameErrors(prev => [...prev, {
                    time:          now,
                    messages:      errorMsgs,
                    score:         finalScore,
                    screenshot,
                    breakdown:     bd,
                    wrongExercise,
                  }]);
                }
              }

              setScore(finalScore);
              setBreakdown(bd);
              setAllScores(prev => [...prev, finalScore]);
              setFeedback(fb);
              setRepCount(reps);
              setFrameCount(c => c + 1);
              setStatus(fb[0]?.message ?? "Analyzing...");
            }
          }
        } catch (err) {
          console.error("Webcam frame error:", err);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, refMotion, ready, detectPose, speak, captureErrorFrame]);

  const formatTime = (s) => {
    const d = new Date(s * 1000);
    return `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  };

  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const resetSession = useCallback(() => {
    setIsFinished(false);
    setActive(false);
    setFrameErrors([]);
    setAllScores([]);
    setFrameCount(0);
    setRepCount(0);
    setScore(null);
    setBreakdown(null);
    setFeedback([]);
    setStatus("Start your camera to begin");
    isRunningRef.current = false;
  }, []);

  return (
    <div>
      {/* Hidden screenshot canvas */}
      <canvas ref={screenshotRef} style={{ display: "none" }} />

      {/* Live webcam view */}
      {!isFinished && (
        <>
          <div style={{
            position: "relative", background: "#111",
            borderRadius: 10, overflow: "hidden",
            minHeight: 280, lineHeight: 0
          }}>
            <video
              ref={webcamRef}
              style={{
                width: "100%", display: "block",
                transform: "scaleX(-1)"
              }}
              muted playsInline
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute", top: 0, left: 0,
                width: "100%", height: "100%",
                pointerEvents: "none",
                transform: "scaleX(-1)"
              }}
            />

            {/* Not started overlay */}
            {!active && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.7)",
                color: "#fff", gap: 12
              }}>
                <span style={{ fontSize: 48 }}>📷</span>
                <span>Camera not started</span>
              </div>
            )}

            {/* Live score badge */}
            {active && score !== null && (
              <div style={{
                position: "absolute", top: 12, right: 12,
                background: score >= 80 ? "#28a745"
                           : score >= 50 ? "#ffc107" : "#dc3545",
                color: "#fff", borderRadius: 8,
                padding: "4px 12px",
                fontWeight: 700, fontSize: 18
              }}>
                {score}%
              </div>
            )}

            {/* Rep counter */}
            {active && (
              <div style={{
                position: "absolute", top: 12, left: 12,
                background: "rgba(0,0,0,0.6)",
                color: "#fff", borderRadius: 8,
                padding: "6px 12px"
              }}>
                <div style={{ fontSize: 11, color: "#aaa" }}>REPS</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{repCount}</div>
              </div>
            )}
          </div>

          {/* Status */}
          {active && (
            <div style={{
              marginTop: 10, padding: "10px 14px",
              background: "rgba(180,108,255,0.1)",
              borderRadius: 8,
              borderLeft: "4px solid #b46cff",
              fontSize: 13, color: "#b46cff"
            }}>
              🔍 {status}
              {frameCount > 0 && (
                <span style={{ marginLeft: 12, color: "#555", fontSize: 12 }}>
                  {frameCount} frames analyzed
                </span>
              )}
            </div>
          )}

          {/* Live feedback pills */}
          {active && feedback.length > 0 && (
            <div style={{
              display: "flex", flexWrap: "wrap",
              gap: 8, marginTop: 10
            }}>
              {feedback.map((f, i) => (
                <span key={i} style={{
                  padding: "4px 12px", borderRadius: 20,
                  fontSize: 12, fontWeight: 600,
                  background:
                    f.severity === "success" ? "rgba(40,167,69,0.2)"
                  : f.severity === "error"   ? "rgba(220,53,69,0.2)"
                  :                           "rgba(255,193,7,0.2)",
                  color:
                    f.severity === "success" ? "#28a745"
                  : f.severity === "error"   ? "#ff4444"
                  :                           "#ffc107",
                  border: `1px solid ${
                    f.severity === "success" ? "#28a745"
                  : f.severity === "error"   ? "#ff4444"
                  :                           "#ffc107"}`
                }}>
                  {f.message}
                </span>
              ))}
            </div>
          )}

          {/* Live breakdown */}
          {active && breakdown && (
            <div style={{ marginTop: 10 }}>
              <ScoreBreakdown breakdown={breakdown} finalScore={score} />
            </div>
          )}

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={startWebcam}
              disabled={active || !refMotion?.frames || !ready}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 6,
                border: "none",
                background: active ? "#444" : "#b46cff",
                color: "#fff", fontWeight: 600,
                cursor: active ? "not-allowed" : "pointer"
              }}
            >
              🎥 Start camera
            </button>
            <button
              onClick={stopWebcam}
              disabled={!active}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 6,
                border: "none",
                background: !active ? "#444" : "#dc3545",
                color: "#fff", fontWeight: 600,
                cursor: !active ? "not-allowed" : "pointer"
              }}
            >
              ⏹ Stop and see summary
            </button>
          </div>
        </>
      )}

      {/* Summary screen */}
      {isFinished && (
        <WebcamSummary
          avgScore={avgScore}
          frameCount={frameCount}
          repCount={repCount}
          frameErrors={frameErrors}
          lastBreakdown={breakdown}
          formatTime={formatTime}
          onReset={resetSession}
        />
      )}
    </div>
  );
}

// ── Webcam Summary ───────────────────────────────────────────────────────────
function WebcamSummary({
  avgScore, frameCount, repCount,
  frameErrors, lastBreakdown, formatTime, onReset
}) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      borderRadius: 12, padding: 20,
      border: "1px solid rgba(255,255,255,0.1)"
    }}>
      <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 20 }}>
        📊 Session Summary
      </h3>

      {/* Score cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 10, marginBottom: 20
      }}>
        {[
          {
            label: "Avg score", value: `${avgScore}%`,
            color: avgScore >= 80 ? "#28a745"
                 : avgScore >= 50 ? "#ffc107" : "#dc3545"
          },
          { label: "Frames analyzed", value: frameCount, color: "#b46cff" },
          { label: "Reps counted",    value: repCount,   color: "#378ADD" },
          {
            label: "Form errors", value: frameErrors.length,
            color: frameErrors.length === 0 ? "#28a745" : "#dc3545"
          },
        ].map((card, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 10, padding: 12, textAlign: "center"
          }}>
            <div style={{ fontSize: 11, color: "#888" }}>{card.label}</div>
            <div style={{
              fontSize: 22, fontWeight: 700,
              marginTop: 4, color: card.color
            }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div style={{
        padding: "12px 16px", borderRadius: 8, marginBottom: 16,
        background: avgScore >= 80
          ? "rgba(40,167,69,0.15)" : "rgba(220,53,69,0.15)",
        border: `1px solid ${avgScore >= 80 ? "#28a745" : "#dc3545"}`,
        color: avgScore >= 80 ? "#28a745" : "#dc3545",
        fontWeight: 600
      }}>
        {avgScore >= 80
          ? `✅ Excellent session! ${repCount} reps with great form.`
          : avgScore >= 50
          ? `⚠️ Good effort! ${repCount} reps but some form issues to fix.`
          : `❌ Form needs work. Review the error moments below.`}
      </div>

      {/* Score breakdown */}
      {lastBreakdown && (
        <div style={{ marginBottom: 16 }}>
          <ScoreBreakdown breakdown={lastBreakdown} finalScore={avgScore} />
        </div>
      )}

      {/* Error screenshots */}
      {frameErrors.length > 0 ? (
        <div>
          <h4 style={{ color: "#fff", margin: "0 0 12px" }}>
            Moments where your form was incorrect:
          </h4>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 10, marginBottom: 16
          }}>
            {frameErrors.map((err, i) => (
              <div
                key={i}
                onClick={() => setSelected(err)}
                style={{
                  cursor: "pointer", borderRadius: 8,
                  overflow: "hidden", position: "relative",
                  border: selected === err
                    ? "2px solid #b46cff"
                    : "2px solid rgba(220,53,69,0.5)"
                }}
              >
                {err.screenshot ? (
                  <img
                    src={err.screenshot}
                    alt={`Error ${i + 1}`}
                    style={{ width: "100%", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: "100%", paddingTop: "75%",
                    background: "rgba(220,53,69,0.2)",
                    position: "relative"
                  }}>
                    <span style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%,-50%)",
                      color: "#ff4444", fontSize: 24
                    }}>⚠</span>
                  </div>
                )}
                <div style={{
                  position: "absolute", bottom: 0,
                  left: 0, right: 0,
                  background: "rgba(0,0,0,0.75)",
                  padding: "3px 8px",
                  display: "flex", justifyContent: "space-between"
                }}>
                  <span style={{
                    color: err.wrongExercise ? "#ff6b35" : "#ff4444",
                    fontSize: 11, fontWeight: 700
                  }}>
                    {err.wrongExercise ? "⛔" : `#${i + 1}`}
                  </span>
                  <span style={{
                    color: err.score >= 50 ? "#ffc107" : "#dc3545",
                    fontSize: 11, fontWeight: 700
                  }}>
                    {err.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Enlarged selected */}
          {selected && (
            <div style={{
              marginBottom: 16, borderRadius: 10,
              overflow: "hidden",
              border: "1px solid #b46cff"
            }}>
              {selected.screenshot && (
                <img
                  src={selected.screenshot}
                  alt="Error detail"
                  style={{ width: "100%", display: "block" }}
                />
              )}
              <div style={{ padding: "12px 16px" }}>
                <div style={{
                  color: selected.wrongExercise ? "#ff6b35" : "#ff4444",
                  fontWeight: 700, marginBottom: 8
                }}>
                  {selected.wrongExercise
                    ? "⛔ Wrong exercise detected"
                    : `Score at this moment: ${selected.score}%`}
                </div>
                {selected.messages.map((msg, i) => (
                  <div key={i} style={{
                    padding: "6px 10px", marginBottom: 4,
                    background: "rgba(220,53,69,0.15)",
                    borderLeft: "3px solid #dc3545",
                    borderRadius: "0 6px 6px 0",
                    color: "#ffaaaa", fontSize: 13
                  }}>
                    ❌ {msg}
                  </div>
                ))}
                {selected.breakdown && (
                  <div style={{ marginTop: 10 }}>
                    <ScoreBreakdown
                      breakdown={selected.breakdown}
                      finalScore={selected.score}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List */}
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {frameErrors.map((err, i) => (
              <div
                key={i}
                onClick={() => setSelected(err)}
                style={{
                  display: "flex", gap: 10,
                  padding: "8px 4px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  cursor: "pointer", alignItems: "center",
                  background: selected === err
                    ? "rgba(180,108,255,0.1)" : "transparent",
                  borderRadius: 4
                }}
              >
                <span style={{
                  background: err.wrongExercise ? "#ff6b35" : "#dc3545",
                  color: "#fff", borderRadius: 4,
                  padding: "2px 8px", fontSize: 12,
                  fontWeight: 700, whiteSpace: "nowrap"
                }}>
                  {err.wrongExercise ? "⛔ Wrong" : `Error ${i + 1}`}
                </span>
                <span style={{ fontSize: 13, color: "#ffaaaa", flex: 1 }}>
                  {err.messages.join(" · ")}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: err.score >= 50 ? "#ffc107" : "#dc3545"
                }}>
                  {err.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          padding: 20, textAlign: "center",
          color: "#28a745", fontSize: 16
        }}>
          🎉 Perfect session! No form errors detected.
        </div>
      )}

      <button
        onClick={onReset}
        style={{
          marginTop: 16, padding: "10px 24px",
          background: "#b46cff", color: "#fff",
          border: "none", borderRadius: 8,
          cursor: "pointer", fontWeight: 600
        }}
      >
        Start new session
      </button>
    </div>
  );
}