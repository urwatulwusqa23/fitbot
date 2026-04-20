
// // src/components/pose/UploadMode.jsx
// import { useRef, useState, useEffect, useCallback } from "react";
// import { usePoseDetector } from "../../hooks/usePoseDetector";
// import {
//   keypointsToMap, extractAngles, normalizePose,
//   compareAgainstMotion, generateFeedback, drawSkeleton
// } from "../../utils/poseUtils";

// export default function UploadMode({ refMotion }) {
//   const { ready, detectPose } = usePoseDetector();

//   const videoRef      = useRef(null);
//   const canvasRef     = useRef(null);
//   const screenshotRef = useRef(null); // hidden canvas for capturing screenshots
//   const rafRef        = useRef(null);
//   const isRunningRef  = useRef(false);
//   const lastErrorTime = useRef(-999);

//   const [videoSrc,    setVideoSrc]    = useState(null);
//   const [feedback,    setFeedback]    = useState([]);
//   const [score,       setScore]       = useState(null);
//   const [frameErrors, setFrameErrors] = useState([]);
//   const [isFinished,  setIsFinished]  = useState(false);
//   const [frameCount,  setFrameCount]  = useState(0);
//   const [status,      setStatus]      = useState("");
//   const [isPlaying,   setIsPlaying]   = useState(false);

//   // ── Capture screenshot of current video frame with skeleton drawn on it ──
//   const captureErrorFrame = useCallback((video, kpMap, differences, errorMessages, frameScore) => {
//     try {
//       const sc  = screenshotRef.current;
//       if (!sc) return null;
//       sc.width  = video.videoWidth;
//       sc.height = video.videoHeight;
//       const ctx = sc.getContext("2d");

//       // Draw actual video frame
//       ctx.drawImage(video, 0, 0, sc.width, sc.height);

//       // Red tint
//       ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
//       ctx.fillRect(0, 0, sc.width, sc.height);

//       // Draw skeleton with color coding
//       drawSkeleton(ctx, kpMap, differences);

//       // Error label at top
//       ctx.fillStyle = "rgba(0,0,0,0.7)";
//       ctx.fillRect(0, 0, sc.width, 44);
//       ctx.fillStyle = "#ff4444";
//       ctx.font      = `bold ${Math.max(14, sc.width * 0.025)}px Arial`;
//       ctx.fillText("⚠ Form Error", 10, 28);

//       // Score badge top right
//       ctx.fillStyle = frameScore >= 50 ? "#ffc107" : "#dc3545";
//       ctx.fillRect(sc.width - 80, 8, 72, 28);
//       ctx.fillStyle = "#fff";
//       ctx.font      = "bold 14px Arial";
//       ctx.fillText(`${frameScore}%`, sc.width - 60, 27);

//       return sc.toDataURL("image/jpeg", 0.7);
//     } catch (err) {
//       console.error("Screenshot error:", err);
//       return null;
//     }
//   }, []);

//   // ── Main processing loop ─────────────────────────────────────────────────
//   const startProcessing = useCallback(() => {
//     if (isRunningRef.current) return;
//     isRunningRef.current = true;
//     let frameNum = 0;

//     const loop = async () => {
//       const video = videoRef.current;
//       if (!video || video.paused || video.ended || !isRunningRef.current) {
//         isRunningRef.current = false;
//         return;
//       }

//       frameNum++;

//       if (frameNum % 3 === 0) {
//         try {
//           const keypoints = await detectPose(video);

//           if (keypoints && keypoints.length > 0) {
//             const canvas = canvasRef.current;
//             const ctx    = canvas?.getContext("2d");

//             if (ctx && canvas) {
//               canvas.width  = video.videoWidth;
//               canvas.height = video.videoHeight;

//               const kpMap      = keypointsToMap(keypoints);
//               const userAngles = extractAngles(normalizePose(kpMap));

//               if (Object.keys(userAngles).length > 0) {
//                 const { differences, score: frameScore } =
//                   compareAgainstMotion(userAngles, refMotion.frames);

//                 const frameFeedback = generateFeedback(differences);
//                 const hasError = frameFeedback.some(f => f.severity === "error");

//                 // Draw skeleton overlay on live video
//                 ctx.clearRect(0, 0, canvas.width, canvas.height);
//                 drawSkeleton(ctx, kpMap, differences);

//                 if (hasError) {
//                   // Red tint on live video
//                   ctx.fillStyle = "rgba(255,0,0,0.15)";
//                   ctx.fillRect(0, 0, canvas.width, canvas.height);
//                   ctx.fillStyle = "rgba(0,0,0,0.6)";
//                   ctx.fillRect(0, 0, canvas.width, 36);
//                   ctx.fillStyle = "#ff4444";
//                   ctx.font      = "bold 15px Arial";
//                   ctx.fillText("⚠ Fix your form", 10, 24);

//                   // Capture screenshot every 1.5 seconds minimum gap
//                   const currentTime = video.currentTime;
//                   if (currentTime - lastErrorTime.current >= 1.5) {
//                     lastErrorTime.current = currentTime;

//                     const errorMessages = frameFeedback
//                       .filter(f => f.severity === "error")
//                       .map(f => f.message);

//                     // Capture actual video frame + skeleton as image
//                     const screenshot = captureErrorFrame(
//                       video, kpMap, differences, errorMessages, frameScore
//                     );

//                     setFrameErrors(prev => [...prev, {
//                       time:       currentTime,
//                       messages:   errorMessages,
//                       score:      frameScore,
//                       screenshot, // base64 image of the error moment
//                     }]);
//                   }
//                 }

//                 setScore(frameScore);
//                 setFeedback(frameFeedback);
//                 setFrameCount(c => c + 1);

//                 const worst = frameFeedback.find(f => f.severity === "error")
//                            || frameFeedback.find(f => f.severity === "warning");
//                 setStatus(worst ? worst.message : "Great form! Keep it up!");
//               }
//             }
//           }
//         } catch (err) {
//           console.error("Frame error:", err);
//         }
//       }

//       rafRef.current = requestAnimationFrame(loop);
//     };

//     rafRef.current = requestAnimationFrame(loop);
//   }, [detectPose, refMotion, captureErrorFrame]);

//   // ── Attach video events ──────────────────────────────────────────────────
//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video || !videoSrc) return;

//     const onPlay = () => {
//       setIsPlaying(true);
//       setIsFinished(false);
//       setStatus("Analyzing your form...");
//       startProcessing();
//     };
//     const onPause = () => {
//       isRunningRef.current = false;
//       cancelAnimationFrame(rafRef.current);
//       setIsPlaying(false);
//       setStatus("Paused — press Play to continue");
//     };
//     const onEnded = () => {
//       isRunningRef.current = false;
//       cancelAnimationFrame(rafRef.current);
//       setIsPlaying(false);
//       setIsFinished(true);
//     };

//     video.addEventListener("play",  onPlay);
//     video.addEventListener("pause", onPause);
//     video.addEventListener("ended", onEnded);

//     return () => {
//       isRunningRef.current = false;
//       cancelAnimationFrame(rafRef.current);
//       video.removeEventListener("play",  onPlay);
//       video.removeEventListener("pause", onPause);
//       video.removeEventListener("ended", onEnded);
//     };
//   }, [videoSrc, startProcessing]);

//   const reset = () => {
//     setVideoSrc(null);
//     setFrameErrors([]);
//     setScore(null);
//     setFeedback([]);
//     setFrameCount(0);
//     setIsFinished(false);
//     setStatus("");
//     isRunningRef.current = false;
//     lastErrorTime.current = -999;
//     cancelAnimationFrame(rafRef.current);
//   };

//   const formatTime = (s) =>
//     `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

//   const avgScore = frameErrors.length > 0
//     ? Math.round(frameErrors.reduce((a, e) => a + e.score, 0) / frameErrors.length)
//     : score ?? 0;

//   return (
//     <div>
//       {/* Hidden screenshot canvas — never shown to user */}
//       <canvas ref={screenshotRef} style={{ display: "none" }} />

//       {/* Model loading */}
//       {!ready && (
//         <div style={{
//           padding: "10px 14px", borderRadius: 8, marginBottom: 12,
//           background: "rgba(180,108,255,0.1)",
//           border: "1px solid #b46cff", color: "#b46cff", fontSize: 13
//         }}>
//           ⏳ Loading pose model...
//         </div>
//       )}

//       {/* File picker */}
//       {!videoSrc && (
//         <label style={{
//           display: "flex", flexDirection: "column",
//           alignItems: "center", justifyContent: "center",
//           border: "2px dashed #b46cff", borderRadius: 12,
//           padding: 40, cursor: ready ? "pointer" : "not-allowed",
//           background: "rgba(180,108,255,0.05)",
//           opacity: ready ? 1 : 0.6, minHeight: 200
//         }}>
//           <span style={{ fontSize: 48 }}>🎬</span>
//           <span style={{ marginTop: 12, fontWeight: 600, color: "#b46cff" }}>
//             Click to upload your exercise video
//           </span>
//           <span style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
//             MP4, MOV, AVI — record yourself doing the exercise
//           </span>
//           <input
//             type="file" accept="video/*"
//             onChange={handleFileChange}
//             disabled={!ready}
//             style={{ display: "none" }}
//           />
//         </label>
//       )}

//       {/* Video + overlay */}
//       {videoSrc && !isFinished && (
//         <>
//           <div style={{
//             position: "relative", width: "100%",
//             background: "#000", borderRadius: 10,
//             overflow: "hidden", lineHeight: 0
//           }}>
//             <video
//               ref={videoRef}
//               src={videoSrc}
//               style={{ width: "100%", display: "block" }}
//               controls playsInline crossOrigin="anonymous"
//             />
//             <canvas
//               ref={canvasRef}
//               style={{
//                 position: "absolute", top: 0, left: 0,
//                 width: "100%", height: "100%",
//                 pointerEvents: "none"
//               }}
//             />
//           </div>

//           {/* Status */}
//           <div style={{
//             marginTop: 10, padding: "10px 14px",
//             background: isPlaying ? "rgba(180,108,255,0.1)" : "rgba(255,255,255,0.05)",
//             borderRadius: 8,
//             borderLeft: `4px solid ${isPlaying ? "#b46cff" : "#555"}`,
//             fontSize: 13, color: isPlaying ? "#b46cff" : "#aaa"
//           }}>
//             {isPlaying ? "🔍 " : "⏸ "}{status}
//             {frameCount > 0 && (
//               <span style={{ marginLeft: 12, color: "#555", fontSize: 12 }}>
//                 {frameCount} frames analyzed
//               </span>
//             )}
//           </div>

//           {/* Score bar */}
//           {score !== null && (
//             <div style={{ marginTop: 10 }}>
//               <div style={{
//                 display: "flex", justifyContent: "space-between",
//                 marginBottom: 4, fontSize: 13
//               }}>
//                 <span style={{ color: "#aaa" }}>Live form score</span>
//                 <span style={{
//                   fontWeight: 700,
//                   color: score >= 80 ? "#28a745" : score >= 50 ? "#ffc107" : "#dc3545"
//                 }}>
//                   {score}%
//                 </span>
//               </div>
//               <div style={{
//                 height: 8, background: "#333",
//                 borderRadius: 4, overflow: "hidden"
//               }}>
//                 <div style={{
//                   width: `${score}%`, height: "100%",
//                   borderRadius: 4, transition: "width 0.3s ease",
//                   background: score >= 80 ? "#28a745" : score >= 50 ? "#ffc107" : "#dc3545"
//                 }} />
//               </div>
//             </div>
//           )}

//           {/* Live feedback */}
//           {feedback.length > 0 && (
//             <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
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

//           <button
//             onClick={reset}
//             style={{
//               marginTop: 12, padding: "6px 14px",
//               borderRadius: 6, border: "1px solid #555",
//               background: "transparent", color: "#aaa",
//               cursor: "pointer", fontSize: 13
//             }}
//           >
//             Upload different video
//           </button>
//         </>
//       )}

//       {/* ── SUMMARY SCREEN ── */}
//       {isFinished && (
//         <SummaryScreen
//           avgScore={avgScore}
//           frameCount={frameCount}
//           frameErrors={frameErrors}
//           formatTime={formatTime}
//           onReset={reset}
//         />
//       )}
//     </div>
//   );

//   function handleFileChange(e) {
//     const file = e.target.files[0];
//     if (!file) return;
//     reset();
//     setVideoSrc(URL.createObjectURL(file));
//     setStatus("Press Play to start analysis");
//   }
// }

// // ── Summary Screen Component ─────────────────────────────────────────────────
// function SummaryScreen({ avgScore, frameCount, frameErrors, formatTime, onReset }) {
//   const [selected, setSelected] = useState(null);

//   return (
//     <div style={{
//       background: "rgba(255,255,255,0.03)",
//       borderRadius: 12, padding: 20,
//       border: "1px solid rgba(255,255,255,0.1)"
//     }}>
//       <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 20 }}>
//         📊 Exercise Analysis Summary
//       </h3>

//       {/* Score cards */}
//       <div style={{
//         display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
//         gap: 12, marginBottom: 20
//       }}>
//         {[
//           {
//             label: "Overall score", value: `${avgScore}%`,
//             color: avgScore >= 80 ? "#28a745" : avgScore >= 50 ? "#ffc107" : "#dc3545"
//           },
//           { label: "Frames analyzed", value: frameCount, color: "#b46cff" },
//           {
//             label: "Form errors", value: frameErrors.length,
//             color: frameErrors.length === 0 ? "#28a745" : "#dc3545"
//           },
//         ].map((card, i) => (
//           <div key={i} style={{
//             background: "rgba(255,255,255,0.05)",
//             borderRadius: 10, padding: 16, textAlign: "center"
//           }}>
//             <div style={{ fontSize: 11, color: "#888" }}>{card.label}</div>
//             <div style={{
//               fontSize: 30, fontWeight: 700, marginTop: 4, color: card.color
//             }}>
//               {card.value}
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Verdict */}
//       <div style={{
//         padding: "12px 16px", borderRadius: 8, marginBottom: 20,
//         background: avgScore >= 80 ? "rgba(40,167,69,0.15)" : "rgba(220,53,69,0.15)",
//         border: `1px solid ${avgScore >= 80 ? "#28a745" : "#dc3545"}`,
//         color: avgScore >= 80 ? "#28a745" : "#dc3545",
//         fontWeight: 600, fontSize: 15
//       }}>
//         {avgScore >= 80
//           ? "✅ Excellent form! You performed this exercise correctly."
//           : avgScore >= 50
//           ? "⚠️ Good effort but some form issues need attention."
//           : "❌ Several form problems detected. Review each moment below."}
//       </div>

//       {/* Error frames with screenshots */}
//       {frameErrors.length > 0 ? (
//         <div>
//           <h4 style={{ color: "#fff", margin: "0 0 12px" }}>
//             Moments where your form was incorrect — click any to enlarge:
//           </h4>

//           {/* Thumbnail grid */}
//           <div style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
//             gap: 10, marginBottom: 16
//           }}>
//             {frameErrors.map((err, i) => (
//               <div
//                 key={i}
//                 onClick={() => setSelected(err)}
//                 style={{
//                   cursor: "pointer", borderRadius: 8, overflow: "hidden",
//                   border: selected === err
//                     ? "2px solid #b46cff"
//                     : "2px solid rgba(220,53,69,0.5)",
//                   transition: "border-color 0.2s",
//                   position: "relative"
//                 }}
//               >
//                 {/* Screenshot or placeholder */}
//                 {err.screenshot ? (
//                   <img
//                     src={err.screenshot}
//                     alt={`Error at ${formatTime(err.time)}`}
//                     style={{ width: "100%", display: "block" }}
//                   />
//                 ) : (
//                   <div style={{
//                     width: "100%", paddingTop: "75%",
//                     background: "rgba(220,53,69,0.2)",
//                     position: "relative"
//                   }}>
//                     <span style={{
//                       position: "absolute", top: "50%", left: "50%",
//                       transform: "translate(-50%,-50%)",
//                       color: "#ff4444", fontSize: 24
//                     }}>⚠</span>
//                   </div>
//                 )}

//                 {/* Timestamp badge */}
//                 <div style={{
//                   position: "absolute", bottom: 0, left: 0, right: 0,
//                   background: "rgba(0,0,0,0.75)",
//                   padding: "4px 8px",
//                   display: "flex", justifyContent: "space-between",
//                   alignItems: "center"
//                 }}>
//                   <span style={{
//                     color: "#ff4444", fontSize: 12, fontWeight: 700
//                   }}>
//                     {formatTime(err.time)}
//                   </span>
//                   <span style={{
//                     color: err.score >= 50 ? "#ffc107" : "#dc3545",
//                     fontSize: 12, fontWeight: 700
//                   }}>
//                     {err.score}%
//                   </span>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Enlarged selected frame */}
//           {selected && (
//             <div style={{
//               marginBottom: 16, borderRadius: 10, overflow: "hidden",
//               border: "1px solid #b46cff",
//               background: "rgba(0,0,0,0.4)"
//             }}>
//               {selected.screenshot && (
//                 <img
//                   src={selected.screenshot}
//                   alt="Selected error frame"
//                   style={{ width: "100%", display: "block" }}
//                 />
//               )}
//               <div style={{ padding: "12px 16px" }}>
//                 <div style={{
//                   color: "#ff4444", fontWeight: 700,
//                   marginBottom: 6, fontSize: 14
//                 }}>
//                   At {formatTime(selected.time)} — Score: {selected.score}%
//                 </div>
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

//           {/* List view */}
//           <div style={{ maxHeight: 200, overflowY: "auto" }}>
//             {frameErrors.map((err, i) => (
//               <div
//                 key={i}
//                 onClick={() => setSelected(err)}
//                 style={{
//                   display: "flex", gap: 10,
//                   padding: "8px 4px",
//                   borderBottom: "1px solid rgba(255,255,255,0.07)",
//                   cursor: "pointer", alignItems: "center",
//                   background: selected === err
//                     ? "rgba(180,108,255,0.1)" : "transparent",
//                   borderRadius: 4
//                 }}
//               >
//                 <span style={{
//                   background: "#dc3545", color: "#fff",
//                   borderRadius: 4, padding: "2px 8px",
//                   fontSize: 12, fontWeight: 700, whiteSpace: "nowrap"
//                 }}>
//                   {formatTime(err.time)}
//                 </span>
//                 <span style={{ fontSize: 13, color: "#ffaaaa", flex: 1 }}>
//                   {err.messages.join(" · ")}
//                 </span>
//                 <span style={{
//                   fontSize: 12, fontWeight: 700,
//                   color: err.score >= 50 ? "#ffc107" : "#dc3545"
//                 }}>
//                   {err.score}%
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       ) : (
//         <div style={{
//           padding: 20, textAlign: "center",
//           color: "#28a745", fontSize: 16
//         }}>
//           🎉 No form errors detected! Perfect exercise!
//         </div>
//       )}

//       <button
//         onClick={onReset}
//         style={{
//           marginTop: 20, padding: "10px 24px",
//           background: "#b46cff", color: "#fff",
//           border: "none", borderRadius: 8,
//           cursor: "pointer", fontWeight: 600, fontSize: 14
//         }}
//       >
//         Try again with a new video
//       </button>
//     </div>
//   );
// }


// // src/components/pose/UploadMode.jsx
// import { useRef, useState, useEffect, useCallback } from "react";
// import { usePoseDetector } from "../../hooks/usePoseDetector";
// import {
//   keypointsToMap, extractAngles, normalizePose,
//   compareAgainstMotion, drawSkeleton,
//   precomputeRefData, createSequenceBuffer, createVelocityTracker
// } from "../../utils/poseUtils";

// export default function UploadMode({ refMotion }) {
//   const { ready, detectPose } = usePoseDetector();

//   const videoRef      = useRef(null);
//   const canvasRef     = useRef(null);
//   const screenshotRef = useRef(null);
//   const rafRef        = useRef(null);
//   const isRunningRef  = useRef(false);
//   const lastErrorTime = useRef(-999);

//   const [videoSrc,    setVideoSrc]    = useState(null);
//   const [feedback,    setFeedback]    = useState([]);
//   const [score,       setScore]       = useState(null);
//   const [frameErrors, setFrameErrors] = useState([]);
//   const [isFinished,  setIsFinished]  = useState(false);
//   const [frameCount,  setFrameCount]  = useState(0);
//   const [status,      setStatus]      = useState("");
//   const [isPlaying,   setIsPlaying]   = useState(false);
//   const [breakdown,   setBreakdown]   = useState(null);

//   // ── Screenshot capture ─────────────────────────────────────────────
//   const captureErrorFrame = useCallback((video, kpMap, differences, msgs, frameScore) => {
//     try {
//       const sc  = screenshotRef.current;
//       if (!sc) return null;

//       sc.width  = video.videoWidth;
//       sc.height = video.videoHeight;

//       const ctx = sc.getContext("2d");

//       ctx.drawImage(video, 0, 0, sc.width, sc.height);

//       ctx.fillStyle = "rgba(255,0,0,0.25)";
//       ctx.fillRect(0, 0, sc.width, sc.height);

//       drawSkeleton(ctx, kpMap, differences);

//       ctx.fillStyle = "rgba(0,0,0,0.7)";
//       ctx.fillRect(0, 0, sc.width, 44);

//       ctx.fillStyle = "#ff4444";
//       ctx.font = "bold 14px Arial";
//       ctx.fillText("⚠ Form Error", 10, 28);

//       ctx.fillStyle = frameScore >= 50 ? "#ffc107" : "#dc3545";
//       ctx.fillRect(sc.width - 80, 8, 70, 28);

//       ctx.fillStyle = "#fff";
//       ctx.fillText(`${frameScore}%`, sc.width - 60, 26);

//       return sc.toDataURL("image/jpeg", 0.7);
//     } catch {
//       return null;
//     }
//   }, []);

//   // ── MAIN PROCESSING (NEW AI LOGIC) ─────────────────────────────────
//   const startProcessing = useCallback(() => {
//     if (isRunningRef.current) return;
//     isRunningRef.current = true;

//     // 🔥 Precompute reference
//     const { activeAngles, exerciseType, refVelocities } =
//       precomputeRefData(refMotion.frames);

//     const userBuffer      = createSequenceBuffer(40);
//     const velocityTracker = createVelocityTracker();

//     console.log("Exercise:", exerciseType);

//     let frameNum = 0;

//     const loop = async () => {
//       const video = videoRef.current;

//       if (!video || video.paused || video.ended || !isRunningRef.current) {
//         isRunningRef.current = false;
//         return;
//       }

//       frameNum++;

//       if (frameNum % 3 === 0) {
//         try {
//           const keypoints = await detectPose(video);

//           if (keypoints?.length > 0) {
//             const canvas = canvasRef.current;
//             const ctx    = canvas?.getContext("2d");

//             if (ctx && canvas) {
//               canvas.width  = video.videoWidth;
//               canvas.height = video.videoHeight;

//               const kpMap      = keypointsToMap(keypoints);
//               const normalized = normalizePose(kpMap);
//               const userAngles = extractAngles(normalized);

//               if (Object.keys(userAngles).length > 0) {

//                 const result = compareAgainstMotion(
//                   userAngles,
//                   normalized,
//                   refMotion.frames,
//                   activeAngles,
//                   userBuffer,
//                   velocityTracker,
//                   refVelocities
//                 );

//                 const {
//                   finalScore,
//                   breakdown,
//                   differences,
//                   wrongExercise,
//                   feedback
//                 } = result;

//                 // Draw skeleton
//                 ctx.clearRect(0, 0, canvas.width, canvas.height);
//                 drawSkeleton(ctx, kpMap, differences);

//                 // Overlay
//                 if (wrongExercise) {
//                   ctx.fillStyle = "rgba(255,0,0,0.35)";
//                   ctx.fillRect(0, 0, canvas.width, canvas.height);

//                   ctx.fillStyle = "#ff4444";
//                   ctx.font = "bold 16px Arial";
//                   ctx.fillText("⛔ Wrong exercise!", 10, 30);
//                 }
//                 else if (feedback.some(f => f.severity === "error")) {
//                   ctx.fillStyle = "rgba(255,0,0,0.15)";
//                   ctx.fillRect(0, 0, canvas.width, canvas.height);

//                   ctx.fillStyle = "#ff4444";
//                   ctx.font = "bold 14px Arial";
//                   ctx.fillText(feedback[0]?.message, 10, 24);
//                 }

//                 // Save error frame
//                 const hasError = feedback.some(f => f.severity === "error");

//                 if (hasError) {
//                   const t = video.currentTime;

//                   if (t - lastErrorTime.current >= 1.5) {
//                     lastErrorTime.current = t;

//                     const screenshot = captureErrorFrame(
//                       video,
//                       kpMap,
//                       differences,
//                       feedback.filter(f => f.severity === "error").map(f => f.message),
//                       finalScore
//                     );

//                     setFrameErrors(prev => [...prev, {
//                       time: t,
//                       score: finalScore,
//                       messages: feedback.filter(f => f.severity === "error").map(f => f.message),
//                       screenshot,
//                       breakdown,
//                       wrongExercise
//                     }]);
//                   }
//                 }

//                 setScore(finalScore);
//                 setBreakdown(breakdown);
//                 setFeedback(feedback);
//                 setFrameCount(c => c + 1);
//                 setStatus(feedback[0]?.message ?? "Analyzing...");
//               }
//             }
//           }
//         } catch (err) {
//           console.error(err);
//         }
//       }

//       rafRef.current = requestAnimationFrame(loop);
//     };

//     rafRef.current = requestAnimationFrame(loop);

//   }, [detectPose, refMotion, captureErrorFrame]);

//   // ── VIDEO EVENTS ─────────────────────────────────────────────────
//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video || !videoSrc) return;

//     const onPlay = () => {
//       setIsPlaying(true);
//       setIsFinished(false);
//       startProcessing();
//     };

//     const onPause = () => {
//       isRunningRef.current = false;
//       cancelAnimationFrame(rafRef.current);
//       setIsPlaying(false);
//     };

//     const onEnded = () => {
//       isRunningRef.current = false;
//       cancelAnimationFrame(rafRef.current);
//       setIsFinished(true);
//     };

//     video.addEventListener("play", onPlay);
//     video.addEventListener("pause", onPause);
//     video.addEventListener("ended", onEnded);

//     return () => {
//       cancelAnimationFrame(rafRef.current);
//       video.removeEventListener("play", onPlay);
//       video.removeEventListener("pause", onPause);
//       video.removeEventListener("ended", onEnded);
//     };

//   }, [videoSrc, startProcessing]);

//   // ── RESET ─────────────────────────────────────────────────
//   const reset = () => {
//     setVideoSrc(null);
//     setFrameErrors([]);
//     setScore(null);
//     setFeedback([]);
//     setFrameCount(0);
//     setIsFinished(false);
//     setStatus("");
//     setBreakdown(null);
//   };

//   // ── FILE UPLOAD (FIXED) ─────────────────────────────────
//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     reset();
//     setVideoSrc(URL.createObjectURL(file));
//     setStatus("Press Play to start analysis");
//   };

//   // ── UI ─────────────────────────────────────────────────
//   return (
//     <div>

//       <canvas ref={screenshotRef} style={{ display: "none" }} />

//       {!videoSrc && (
//         <input type="file" accept="video/*" onChange={handleFileChange} />
//       )}

//       {videoSrc && !isFinished && (
//         <>
//           <video ref={videoRef} src={videoSrc} controls style={{ width: "100%" }} />
//           <canvas ref={canvasRef} style={{
//             position: "absolute", top: 0, left: 0, width: "100%"
//           }} />

//           <div>Score: {score}</div>
//           <div>{status}</div>
//         </>
//       )}

//       {isFinished && (
//         <div>
//           <h3>Summary</h3>
//           <p>Avg Score: {score}</p>
//           <p>Frames: {frameCount}</p>
//         </div>
//       )}

//     </div>
//   );
// }


// src/components/pose/UploadMode.jsx
import { useRef, useState, useEffect, useCallback } from "react";
import { usePoseDetector } from "../../hooks/usePoseDetector";
import {
  keypointsToMap, extractAngles, normalizePose,
  compareAgainstMotion, drawSkeleton,
  precomputeRefData, createSequenceBuffer, createVelocityTracker
} from "../../utils/poseUtils";
import ScoreBreakdown from "./ScoreBreakdown";

export default function UploadMode({ refMotion }) {
  const { ready, detectPose } = usePoseDetector();

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const screenshotRef = useRef(null);
  const rafRef        = useRef(null);
  const isRunningRef  = useRef(false);
  const lastErrorTime = useRef(-999);

  // Precomputed reference data — computed once when refMotion loads
  const refDataRef = useRef(null);
  const userBufferRef     = useRef(null);
  const velocityTrackerRef = useRef(null);

  const [videoSrc,    setVideoSrc]    = useState(null);
  const [feedback,    setFeedback]    = useState([]);
  const [score,       setScore]       = useState(null);
  const [breakdown,   setBreakdown]   = useState(null);
  const [frameErrors, setFrameErrors] = useState([]);
  const [isFinished,  setIsFinished]  = useState(false);
  const [frameCount,  setFrameCount]  = useState(0);
  const [status,      setStatus]      = useState("");
  const [isPlaying,   setIsPlaying]   = useState(false);

  // Precompute reference data when refMotion changes
  useEffect(() => {
    if (!refMotion?.frames) return;
    refDataRef.current       = precomputeRefData(refMotion.frames);
    userBufferRef.current    = createSequenceBuffer(40);
    velocityTrackerRef.current = createVelocityTracker();
    console.log("Reference precomputed:",
      refDataRef.current.exerciseType,
      refDataRef.current.activeAngles.map(a => a.name)
    );
  }, [refMotion]);

  // ── Screenshot capture ───────────────────────────────────────────────────
  const captureErrorFrame = useCallback((
    video, kpMap, differences, errorMessages, frameScore
  ) => {
    try {
      const sc  = screenshotRef.current;
      if (!sc) return null;
      sc.width  = video.videoWidth;
      sc.height = video.videoHeight;
      const ctx = sc.getContext("2d");
      ctx.drawImage(video, 0, 0, sc.width, sc.height);
      ctx.fillStyle = "rgba(255,0,0,0.25)";
      ctx.fillRect(0, 0, sc.width, sc.height);
      drawSkeleton(ctx, kpMap, differences);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, sc.width, 44);
      ctx.fillStyle = "#ff4444";
      ctx.font      = `bold ${Math.max(14, sc.width * 0.025)}px Arial`;
      ctx.fillText("⚠ Form Error", 10, 28);
      ctx.fillStyle = frameScore >= 50 ? "#ffc107" : "#dc3545";
      ctx.fillRect(sc.width - 80, 8, 72, 28);
      ctx.fillStyle = "#fff";
      ctx.font      = "bold 14px Arial";
      ctx.fillText(`${frameScore}%`, sc.width - 60, 27);
      return sc.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.error("Screenshot error:", err);
      return null;
    }
  }, []);

  // ── Main processing loop ─────────────────────────────────────────────────
  const startProcessing = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Reset per-session trackers
    userBufferRef.current     = createSequenceBuffer(40);
    velocityTrackerRef.current = createVelocityTracker();

    const { activeAngles, refVelocities } = refDataRef.current ?? {
      activeAngles: [], refVelocities: {}
    };

    let frameNum = 0;

    const loop = async () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended || !isRunningRef.current) {
        isRunningRef.current = false;
        return;
      }

      frameNum++;

      if (frameNum % 3 === 0) {
        try {
          const keypoints = await detectPose(video);

          if (keypoints && keypoints.length > 0) {
            const canvas = canvasRef.current;
            const ctx    = canvas?.getContext("2d");

            if (ctx && canvas) {
              canvas.width  = video.videoWidth;
              canvas.height = video.videoHeight;

              const kpMap      = keypointsToMap(keypoints);
              const normalized = normalizePose(kpMap);
              const userAngles = extractAngles(normalized);

              if (Object.keys(userAngles).length > 0) {
                // ── Run all 6 techniques ───────────────────────────────────
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

                // ── Draw skeleton overlay ──────────────────────────────────
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawSkeleton(ctx, kpMap, differences);

                // ── Red overlays ───────────────────────────────────────────
                if (wrongExercise) {
                  ctx.fillStyle = "rgba(255,0,0,0.35)";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = "rgba(0,0,0,0.8)";
                  ctx.fillRect(0, 0, canvas.width, 50);
                  ctx.fillStyle = "#ff4444";
                  ctx.font      = `bold ${Math.max(14, canvas.width * 0.028)}px Arial`;
                  ctx.fillText("⛔ Wrong exercise — does not match reference", 10, 34);
                } else if (fb.some(f => f.severity === "error")) {
                  ctx.fillStyle = "rgba(255,0,0,0.15)";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = "rgba(0,0,0,0.65)";
                  ctx.fillRect(0, 0, canvas.width, 38);
                  ctx.fillStyle = "#ff4444";
                  ctx.font      = "bold 15px Arial";
                  ctx.fillText(
                    "⚠ " + (fb[0]?.message ?? "Fix your form"),
                    10, 26
                  );
                }

                // ── Capture error moment ───────────────────────────────────
                const hasError = fb.some(f => f.severity === "error");
                if (hasError) {
                  const t = video.currentTime;
                  if (t - lastErrorTime.current >= 1.5) {
                    lastErrorTime.current = t;
                    const errorMsgs = fb
                      .filter(f => f.severity === "error")
                      .map(f => f.message);
                    const screenshot = captureErrorFrame(
                      video, kpMap, differences, errorMsgs, finalScore
                    );
                    setFrameErrors(prev => [...prev, {
                      time:          t,
                      score:         finalScore,
                      messages:      errorMsgs,
                      screenshot,
                      breakdown:     bd,
                      wrongExercise,
                    }]);
                  }
                }

                setScore(finalScore);
                setBreakdown(bd);
                setFeedback(fb);
                setFrameCount(c => c + 1);
                setStatus(fb[0]?.message ?? "Analyzing...");
              }
            }
          } else {
            // No person detected
            const canvas = canvasRef.current;
            const ctx    = canvas?.getContext("2d");
            if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setStatus("No person detected — make sure you are in frame");
          }
        } catch (err) {
          console.error("Frame processing error:", err);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [detectPose, refMotion, captureErrorFrame]);

  // ── Video event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const onPlay = () => {
      setIsPlaying(true);
      setIsFinished(false);
      setStatus("Analyzing your form...");
      startProcessing();
    };
    const onPause = () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
      setStatus("Paused — press Play to continue");
    };
    const onEnded = () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
      setIsFinished(true);
    };
    const onLoadedMetadata = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
      }
    };

    video.addEventListener("play",            onPlay);
    video.addEventListener("pause",           onPause);
    video.addEventListener("ended",           onEnded);
    video.addEventListener("loadedmetadata",  onLoadedMetadata);

    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play",           onPlay);
      video.removeEventListener("pause",          onPause);
      video.removeEventListener("ended",          onEnded);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [videoSrc, startProcessing]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    isRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    lastErrorTime.current = -999;
    setVideoSrc(null);
    setFrameErrors([]);
    setScore(null);
    setBreakdown(null);
    setFeedback([]);
    setFrameCount(0);
    setIsFinished(false);
    setIsPlaying(false);
    setStatus("");
    // Reset trackers
    userBufferRef.current     = createSequenceBuffer(40);
    velocityTrackerRef.current = createVelocityTracker();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    reset();
    setVideoSrc(URL.createObjectURL(file));
    setStatus("Press Play to start analysis");
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const avgScore = frameErrors.length > 0
    ? Math.round(frameErrors.reduce((a, e) => a + e.score, 0) / frameErrors.length)
    : score ?? 0;

  return (
    <div>
      {/* Hidden screenshot canvas */}
      <canvas ref={screenshotRef} style={{ display: "none" }} />

      {/* Model loading */}
      {!ready && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12,
          background: "rgba(180,108,255,0.1)",
          border: "1px solid #b46cff", color: "#b46cff", fontSize: 13
        }}>
          ⏳ Loading pose model...
        </div>
      )}

      {/* File picker */}
      {!videoSrc && (
        <label style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          border: "2px dashed #b46cff", borderRadius: 12,
          padding: 40, cursor: ready ? "pointer" : "not-allowed",
          background: "rgba(180,108,255,0.05)",
          opacity: ready ? 1 : 0.6, minHeight: 200
        }}>
          <span style={{ fontSize: 48 }}>🎬</span>
          <span style={{ marginTop: 12, fontWeight: 600, color: "#b46cff" }}>
            Click to upload your exercise video
          </span>
          <span style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
            MP4, MOV, AVI — record yourself doing the exercise
          </span>
          <input
            type="file" accept="video/*"
            onChange={handleFileChange}
            disabled={!ready}
            style={{ display: "none" }}
          />
        </label>
      )}

      {/* Video + overlay */}
      {videoSrc && !isFinished && (
        <>
          <div style={{
            position: "relative", width: "100%",
            background: "#000", borderRadius: 10,
            overflow: "hidden", lineHeight: 0
          }}>
            <video
              ref={videoRef}
              src={videoSrc}
              style={{ width: "100%", display: "block" }}
              controls playsInline crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute", top: 0, left: 0,
                width: "100%", height: "100%",
                pointerEvents: "none"
              }}
            />
          </div>

          {/* Status bar */}
          <div style={{
            marginTop: 10, padding: "10px 14px",
            background: isPlaying
              ? "rgba(180,108,255,0.1)"
              : "rgba(255,255,255,0.05)",
            borderRadius: 8,
            borderLeft: `4px solid ${isPlaying ? "#b46cff" : "#555"}`,
            fontSize: 13,
            color: isPlaying ? "#b46cff" : "#aaa"
          }}>
            {isPlaying ? "🔍 " : "⏸ "}{status}
            {frameCount > 0 && (
              <span style={{ marginLeft: 12, color: "#555", fontSize: 12 }}>
                {frameCount} frames analyzed
              </span>
            )}
          </div>

          {/* Live score bar */}
          {score !== null && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 4, fontSize: 13
              }}>
                <span style={{ color: "#aaa" }}>Live form score</span>
                <span style={{
                  fontWeight: 700,
                  color: score >= 80 ? "#28a745"
                       : score >= 50 ? "#ffc107" : "#dc3545"
                }}>
                  {score}%
                </span>
              </div>
              <div style={{
                height: 8, background: "#333",
                borderRadius: 4, overflow: "hidden"
              }}>
                <div style={{
                  width: `${score}%`, height: "100%",
                  borderRadius: 4, transition: "width 0.3s ease",
                  background: score >= 80 ? "#28a745"
                             : score >= 50 ? "#ffc107" : "#dc3545"
                }} />
              </div>
            </div>
          )}

          {/* Live feedback pills */}
          {feedback.length > 0 && (
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

          {/* Live breakdown — collapsed by default */}
          {breakdown && (
            <div style={{ marginTop: 10 }}>
              <ScoreBreakdown breakdown={breakdown} finalScore={score} />
            </div>
          )}

          <button
            onClick={reset}
            style={{
              marginTop: 12, padding: "6px 14px",
              borderRadius: 6, border: "1px solid #555",
              background: "transparent", color: "#aaa",
              cursor: "pointer", fontSize: 13
            }}
          >
            Upload different video
          </button>
        </>
      )}

      {/* Summary screen */}
      {isFinished && (
        <SummaryScreen
          avgScore={avgScore}
          frameCount={frameCount}
          frameErrors={frameErrors}
          formatTime={formatTime}
          onReset={reset}
        />
      )}
    </div>
  );
}

// ── Summary Screen ───────────────────────────────────────────────────────────
function SummaryScreen({ avgScore, frameCount, frameErrors, formatTime, onReset }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      borderRadius: 12, padding: 20,
      border: "1px solid rgba(255,255,255,0.1)"
    }}>
      <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 20 }}>
        📊 Exercise Analysis Summary
      </h3>

      {/* Score cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12, marginBottom: 20
      }}>
        {[
          {
            label: "Overall score", value: `${avgScore}%`,
            color: avgScore >= 80 ? "#28a745"
                 : avgScore >= 50 ? "#ffc107" : "#dc3545"
          },
          { label: "Frames analyzed", value: frameCount, color: "#b46cff" },
          {
            label: "Form errors", value: frameErrors.length,
            color: frameErrors.length === 0 ? "#28a745" : "#dc3545"
          },
        ].map((card, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 10, padding: 16, textAlign: "center"
          }}>
            <div style={{ fontSize: 11, color: "#888" }}>{card.label}</div>
            <div style={{
              fontSize: 30, fontWeight: 700,
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
        fontWeight: 600, fontSize: 15
      }}>
        {avgScore >= 80
          ? "✅ Excellent form! You performed this exercise correctly."
          : avgScore >= 50
          ? "⚠️ Good effort but some form issues need attention."
          : "❌ Several form problems detected. Review each moment below."}
      </div>

      {/* Overall score breakdown */}
      {frameErrors.length > 0 && frameErrors[frameErrors.length - 1]?.breakdown && (
        <div style={{ marginBottom: 16 }}>
          <ScoreBreakdown
            breakdown={frameErrors[frameErrors.length - 1].breakdown}
            finalScore={avgScore}
          />
        </div>
      )}

      {/* Error frame thumbnails */}
      {frameErrors.length > 0 ? (
        <div>
          <h4 style={{ color: "#fff", margin: "0 0 12px" }}>
            Moments where your form was incorrect — click to enlarge:
          </h4>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
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
                    : "2px solid rgba(220,53,69,0.5)",
                  transition: "border-color 0.2s"
                }}
              >
                {err.screenshot ? (
                  <img
                    src={err.screenshot}
                    alt={`Error at ${formatTime(err.time)}`}
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
                  padding: "4px 8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{
                    color: err.wrongExercise ? "#ff6b35" : "#ff4444",
                    fontSize: 11, fontWeight: 700
                  }}>
                    {err.wrongExercise ? "⛔ Wrong" : formatTime(err.time)}
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

          {/* Enlarged selected frame */}
          {selected && (
            <div style={{
              marginBottom: 16, borderRadius: 10,
              overflow: "hidden",
              border: "1px solid #b46cff",
              background: "rgba(0,0,0,0.4)"
            }}>
              {selected.screenshot && (
                <img
                  src={selected.screenshot}
                  alt="Selected error"
                  style={{ width: "100%", display: "block" }}
                />
              )}
              <div style={{ padding: "12px 16px" }}>
                <div style={{
                  color: selected.wrongExercise ? "#ff6b35" : "#ff4444",
                  fontWeight: 700, marginBottom: 8, fontSize: 14
                }}>
                  {selected.wrongExercise
                    ? "⛔ Wrong exercise detected"
                    : `At ${formatTime(selected.time)} — Score: ${selected.score}%`}
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

                {/* Per-frame breakdown */}
                {selected.breakdown && (
                  <div style={{ marginTop: 12 }}>
                    <ScoreBreakdown
                      breakdown={selected.breakdown}
                      finalScore={selected.score}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error list */}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
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
                  {err.wrongExercise ? "⛔ Wrong" : formatTime(err.time)}
                </span>
                <span style={{
                  fontSize: 13, color: "#ffaaaa", flex: 1
                }}>
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
          🎉 No form errors detected! Perfect exercise!
        </div>
      )}

      <button
        onClick={onReset}
        style={{
          marginTop: 20, padding: "10px 24px",
          background: "#b46cff", color: "#fff",
          border: "none", borderRadius: 8,
          cursor: "pointer", fontWeight: 600, fontSize: 14
        }}
      >
        Try again with a new video
      </button>
    </div>
  );
}


