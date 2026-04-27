// src/utils/poseUtils.js
// ═══════════════════════════════════════════════════════════════
// FitBot Pose Analysis Engine — 6 technique combined scoring
// ═══════════════════════════════════════════════════════════════

// ── Joint definitions ────────────────────────────────────────────────────────
export const KEYPOINT_NAMES = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle"
];

export const ANGLE_TRIPLETS = {
  left_elbow_angle:     ["left_shoulder",  "left_elbow",    "left_wrist"],
  right_elbow_angle:    ["right_shoulder", "right_elbow",   "right_wrist"],
  left_shoulder_angle:  ["left_elbow",     "left_shoulder", "left_hip"],
  right_shoulder_angle: ["right_elbow",    "right_shoulder","right_hip"],
  left_knee_angle:      ["left_hip",       "left_knee",     "left_ankle"],
  right_knee_angle:     ["right_hip",      "right_knee",    "right_ankle"],
  left_hip_angle:       ["left_shoulder",  "left_hip",      "left_knee"],
  right_hip_angle:      ["right_shoulder", "right_hip",     "right_knee"],
};

export const SKELETON_CONNECTIONS = [
  ["left_shoulder",  "right_shoulder"],
  ["left_shoulder",  "left_elbow"],
  ["left_elbow",     "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow",    "right_wrist"],
  ["left_shoulder",  "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip",       "right_hip"],
  ["left_hip",       "left_knee"],
  ["left_knee",      "left_ankle"],
  ["right_hip",      "right_knee"],
  ["right_knee",     "right_ankle"],
];

// Symmetry pairs — left joint vs right joint
const SYMMETRY_PAIRS = [
  ["left_elbow_angle",    "right_elbow_angle"],
  ["left_shoulder_angle", "right_shoulder_angle"],
  ["left_knee_angle",     "right_knee_angle"],
  ["left_hip_angle",      "right_hip_angle"],
];

// Scoring weights — must sum to 1.0
const WEIGHTS = {
  angle:     0.25,
  dtw:       0.25,
  embedding: 0.20,
  velocity:  0.15,
  symmetry:  0.10,
  phase:     0.05,
};

// ── Core math ────────────────────────────────────────────────────────────────
// ── ENHANCED: Dot product angle (replaces atan2 — clean 0-180°, no wraparound) ──
export function computeAngle(a, b, c) {
  // Vector from vertex b to point a
  const ba = { x: a.x - b.x, y: a.y - b.y };
  // Vector from vertex b to point c
  const bc = { x: c.x - b.x, y: c.y - b.y };

  // Dot product
  const dot = ba.x * bc.x + ba.y * bc.y;

  // Magnitudes
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);

  // Clamp to [-1, 1] to prevent NaN from floating point errors
  const cosine = dot / (magBA * magBC + 1e-6);
  const clamped = Math.max(-1.0, Math.min(1.0, cosine));

  // Returns 0-180° — no wraparound, no false rep triggers
  return (Math.acos(clamped) * 180) / Math.PI;
}

// ── ENHANCED: Hysteresis rep counter — works for ANY exercise joint ──────────
// Hysteresis means two separate thresholds for up/down
// This prevents false triggers when angle hovers near one threshold
export function createRepCounter(
  angleName,
  upThreshold   = 150,  // angle > 150° = fully extended (DOWN position)
  downThreshold = 90    // angle < 90°  = fully contracted (UP position)
) {
  let stage       = "down";  // current stage: "up" | "down"
  let reps        = 0;
  let lastAngle   = null;
  let frameCount  = 0;       // frames in current stage (for speed detection)
  let stageFrames = 0;       // total frames to complete one rep phase

  return function tick(angles) {
    const angle = angles[angleName];
    if (angle === undefined || angle === null) return { reps, stage, speed: "unknown" };

    frameCount++;

    // Stage transition with hysteresis
    // Only transition when clearly past threshold — prevents bouncing
    if (angle < downThreshold && stage === "down") {
      // Contracted position reached — this is the UP phase of a curl
      stage       = "up";
      stageFrames = frameCount;
      frameCount  = 0;
    }

    if (angle > upThreshold && stage === "up") {
      // Extended position reached — rep complete
      stage = "down";
      reps++;

      // Speed quality based on how many frames the rep took
      // At 30fps: good rep = 20-60 frames (0.7-2s)
      const repFrames = stageFrames + frameCount;
      let speed;
      if      (repFrames < 15) speed = "Too Fast";   // < 0.5s per rep
      else if (repFrames > 90) speed = "Too Slow";   // > 3s per rep
      else                     speed = "Good Form";

      frameCount  = 0;
      stageFrames = 0;
      lastAngle   = angle;

      return { reps, stage, speed };
    }

    lastAngle = angle;
    return { reps, stage, speed: "Good Form" };
  };
}

// ── NEW: Calorie estimator ────────────────────────────────────────────────────
// Based on MET (Metabolic Equivalent of Task) values for exercise
// Formula: Calories = MET × weight(kg) × time(hours)
export function createCalorieEstimator(weightKg = 70) {
  const MET_VALUES = {
    upper_body: 4.0,   // resistance training — upper body
    lower_body: 5.0,   // resistance training — lower body (more muscle mass)
    full_body:  5.5,   // full body compound movements
    unknown:    4.5,   // default
  };

  let totalCalories = 0;
  let startTime     = null;

  return {
    start() {
      startTime = Date.now();
    },

    update(exerciseType = "unknown") {
      if (!startTime) return 0;
      const elapsedHours = (Date.now() - startTime) / 3600000;
      const met          = MET_VALUES[exerciseType] ?? 4.5;
      totalCalories      = met * weightKg * elapsedHours;
      return Math.round(totalCalories * 10) / 10; // one decimal place
    },

    reset() {
      totalCalories = 0;
      startTime     = Date.now();
    },

    getTotal() {
      return Math.round(totalCalories * 10) / 10;
    }
  };
}

// ── NEW: Rest timer ───────────────────────────────────────────────────────────
// Triggers automatically after each set (configurable reps per set)
export function createRestTimer(repsPerSet = 10, restSeconds = 60) {
  let lastSetReps   = 0;
  let resting       = false;
  let restStartTime = null;
  let setCount      = 0;

  return {
    update(currentReps) {
      // Check if a new set just completed
      if (currentReps > 0 && currentReps % repsPerSet === 0 && currentReps !== lastSetReps) {
        lastSetReps   = currentReps;
        resting       = true;
        restStartTime = Date.now();
        setCount++;
        return { resting: true, secondsLeft: restSeconds, setCount };
      }

      if (resting && restStartTime) {
        const elapsed     = (Date.now() - restStartTime) / 1000;
        const secondsLeft = Math.max(0, Math.ceil(restSeconds - elapsed));
        if (secondsLeft === 0) {
          resting       = false;
          restStartTime = null;
        }
        return { resting: secondsLeft > 0, secondsLeft, setCount };
      }

      return { resting: false, secondsLeft: 0, setCount };
    },

    isResting() { return resting; },
    getSetCount() { return setCount; }
  };
}

// ── ENHANCED: HUD drawing — replaces plain skeleton for webcam ────────────────
export function drawHUD(ctx, keypointMap, differences, repData, calories, restTimer, score) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // ── 1. Draw skeleton with color-coded joints ──
  drawSkeleton(ctx, keypointMap, differences);

  // ── 2. Top-left stats panel ──
  const panelW = 180;
  const panelH = restTimer?.resting ? 200 : 160;

  // Rounded panel background
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  roundRect(ctx, 12, 12, panelW, panelH, 10);
  ctx.fill();
  ctx.restore();

  // Score bar (vertical, left side of panel)
  const barH      = panelH - 24;
  const barFill   = (score / 100) * barH;
  const barColor  = score >= 80 ? "#44ff44" : score >= 50 ? "#ffaa00" : "#ff4444";

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, 20, 20, 12, barH, 6);
  ctx.fill();
  ctx.fillStyle = barColor;
  roundRect(ctx, 20, 20 + (barH - barFill), 12, barFill, 6);
  ctx.fill();
  ctx.restore();

  // Stats text
  ctx.save();
  ctx.font        = "bold 13px Arial";
  ctx.fillStyle   = "#ffffff";
  ctx.textBaseline = "top";

  ctx.fillText(`REPS`,          40, 22);
  ctx.font      = "bold 26px Arial";
  ctx.fillStyle = "#b46cff";
  ctx.fillText(repData?.reps ?? 0,   40, 36);

  ctx.font      = "bold 12px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`SETS`,          100, 22);
  ctx.font      = "bold 22px Arial";
  ctx.fillStyle = "#b46cff";
  ctx.fillText(restTimer?.setCount ?? 0, 100, 36);

  ctx.font      = "bold 12px Arial";
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText(`SCORE`,         40, 72);
  ctx.font      = "bold 18px Arial";
  ctx.fillStyle = barColor;
  ctx.fillText(`${score}%`,     40, 86);

  ctx.font      = "bold 12px Arial";
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText(`CALORIES`,      40, 112);
  ctx.font      = "bold 16px Arial";
  ctx.fillStyle = "#EF9F27";
  ctx.fillText(`${calories} kcal`, 40, 126);

  // Speed quality badge
  const speed = repData?.speed ?? "Good Form";
  ctx.font      = "bold 11px Arial";
  ctx.fillStyle = speed === "Too Fast" ? "#ff4444"
                : speed === "Too Slow" ? "#ffaa00"
                : "#44ff44";
  ctx.fillText(`⚡ ${speed}`, 40, 150);

  // Rest timer
  if (restTimer?.resting) {
    ctx.font      = "bold 12px Arial";
    ctx.fillStyle = "#378ADD";
    ctx.fillText(`REST: ${restTimer.secondsLeft}s`, 40, 172);
    ctx.font      = "bold 10px Arial";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(`Set ${restTimer.setCount} complete!`, 40, 188);
  }

  ctx.restore();

  // ── 3. Stage indicator (top center) ──
  const stage = repData?.stage;
  if (stage) {
    const label = stage === "up" ? "↑ CONTRACT" : "↓ EXTEND";
    const labelW = 120;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    roundRect(ctx, W / 2 - labelW / 2, 12, labelW, 32, 8);
    ctx.fill();
    ctx.font        = "bold 13px Arial";
    ctx.fillStyle   = stage === "up" ? "#44ff44" : "#b46cff";
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, W / 2, 28);
    ctx.restore();
  }
}

// ── Rounded rect helper (canvas API does not have this natively) ──────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function keypointsToMap(keypoints) {
  const map = {};
  keypoints.forEach(kp => { map[kp.name] = kp; });
  return map;
}

export function extractAngles(keypointMap) {
  const angles = {};
  for (const [angleName, [a, b, c]] of Object.entries(ANGLE_TRIPLETS)) {
    const pa = keypointMap[a];
    const pb = keypointMap[b];
    const pc = keypointMap[c];
    if (pa?.score > 0.3 && pb?.score > 0.3 && pc?.score > 0.3) {
      angles[angleName] = computeAngle(pa, pb, pc);
    }
  }
  return angles;
}

export function normalizePose(keypointMap) {
  const lh = keypointMap["left_hip"];
  const rh = keypointMap["right_hip"];
  const ls = keypointMap["left_shoulder"];
  const rs = keypointMap["right_shoulder"];
  if (!lh || !rh || !ls || !rs) return keypointMap;
  const cx    = (lh.x + rh.x) / 2;
  const cy    = (lh.y + rh.y) / 2;
  const scx   = (ls.x + rs.x) / 2;
  const scy   = (ls.y + rs.y) / 2;
  const scale = Math.sqrt((scx - cx) ** 2 + (scy - cy) ** 2) || 1;
  const normalized = {};
  for (const [name, kp] of Object.entries(keypointMap)) {
    normalized[name] = {
      ...kp,
      x: (kp.x - cx) / scale,
      y: (kp.y - cy) / scale,
    };
  }
  return normalized;
}

// ── TECHNIQUE 1: Active angle detection ──────────────────────────────────────
export function getActiveAngles(frames) {
  if (!frames || frames.length === 0) return [];
  const activeAngles = [];
  for (const angleName of Object.keys(ANGLE_TRIPLETS)) {
    const values = frames
      .map(f => f.angles?.[angleName])
      .filter(v => v !== undefined && v !== null);
    if (values.length < 2) continue;
    const mean     = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev   = Math.sqrt(variance);
    // Only angles with meaningful movement (stdDev > 8°)
    if (stdDev > 8) {
      activeAngles.push({ name: angleName, mean, stdDev, min: Math.min(...values), max: Math.max(...values) });
    }
  }
  return activeAngles;
}

export function classifyExerciseType(frames) {
  if (!frames || frames.length === 0) return "unknown";
  const upper = ["left_elbow_angle","right_elbow_angle","left_shoulder_angle","right_shoulder_angle"];
  const lower = ["left_knee_angle","right_knee_angle","left_hip_angle","right_hip_angle"];
  const variance = (names) => {
    let total = 0, count = 0;
    for (const n of names) {
      const vals = frames.map(f => f.angles?.[n]).filter(v => v != null);
      if (vals.length < 2) continue;
      const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
      total += vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length;
      count++;
    }
    return count > 0 ? total / count : 0;
  };
  const uv = variance(upper);
  const lv = variance(lower);
  if (uv > lv + 20) return "upper_body";
  if (lv > uv + 20) return "lower_body";
  return "full_body";
}

// ── TECHNIQUE 2: Angle comparison score ──────────────────────────────────────
function computeAngleScore(userAngles, bestRefFrame, activeAngles) {
  const activeNames = activeAngles.map(a => a.name);
  const differences = {};
  let totalDiff = 0, count = 0;

  for (const angleName of activeNames) {
    const refVal  = bestRefFrame.angles?.[angleName];
    const userVal = userAngles[angleName];
    if (refVal == null || userVal == null) continue;
    const diff = Math.abs(refVal - userVal);
    differences[angleName] = { ref: refVal, user: userVal, diff };
    totalDiff += diff;
    count++;
  }

  const avgDiff = count > 0 ? totalDiff / count : 90;
  const score   = Math.max(0, Math.min(100, 100 - (avgDiff / 90) * 100));
  return { score, differences, avgDiff };
}

// ── TECHNIQUE 3: DTW sequence matching ───────────────────────────────────────
// Compares the user's angle sequence over time against the reference sequence
// Catches wrong speed, wrong order, partial movement

class DTWEngine {
  // Simplified DTW — computes cost matrix between two sequences
  static compute(seq1, seq2) {
    const n = seq1.length;
    const m = seq2.length;
    if (n === 0 || m === 0) return 100;

    // Limit sequence length for performance
    const s1 = seq1.slice(-40);
    const s2 = seq2.slice(0, 40);
    const N  = s1.length;
    const M  = s2.length;

    const cost = Array.from({ length: N }, () => new Array(M).fill(Infinity));
    cost[0][0] = Math.abs(s1[0] - s2[0]);

    for (let i = 1; i < N; i++) cost[i][0] = cost[i-1][0] + Math.abs(s1[i] - s2[0]);
    for (let j = 1; j < M; j++) cost[0][j] = cost[0][j-1] + Math.abs(s1[0] - s2[j]);

    for (let i = 1; i < N; i++) {
      for (let j = 1; j < M; j++) {
        const c = Math.abs(s1[i] - s2[j]);
        cost[i][j] = c + Math.min(cost[i-1][j], cost[i][j-1], cost[i-1][j-1]);
      }
    }

    const dtwDist = cost[N-1][M-1] / Math.max(N, M);
    // Convert distance to 0-100 score
    return Math.max(0, Math.min(100, 100 - dtwDist / 1.5));
  }
}

// User sequence buffer — stores last N frames of user angles
class SequenceBuffer {
  constructor(maxLength = 40) {
    this.buffer = {};
    this.maxLength = maxLength;
  }

  push(angles) {
    for (const [name, val] of Object.entries(angles)) {
      if (!this.buffer[name]) this.buffer[name] = [];
      this.buffer[name].push(val);
      if (this.buffer[name].length > this.maxLength) {
        this.buffer[name].shift();
      }
    }
  }

  getSequence(angleName) {
    return this.buffer[angleName] ?? [];
  }

  get length() {
    const keys = Object.keys(this.buffer);
    return keys.length > 0 ? this.buffer[keys[0]].length : 0;
  }
}

export function createSequenceBuffer(maxLength = 40) {
  return new SequenceBuffer(maxLength);
}

function computeDTWScore(userBuffer, refFrames, activeAngles) {
  if (!userBuffer || userBuffer.length < 5) {
    return { score: 50, detail: "Not enough frames yet" };
  }

  const activeNames = activeAngles.map(a => a.name);
  let totalScore = 0;
  let count = 0;

  for (const angleName of activeNames) {
    const userSeq = userBuffer.getSequence(angleName);
    const refSeq  = refFrames
      .map(f => f.angles?.[angleName])
      .filter(v => v != null);

    if (userSeq.length < 3 || refSeq.length < 3) continue;
    totalScore += DTWEngine.compute(userSeq, refSeq);
    count++;
  }

  const score = count > 0 ? totalScore / count : 50;
  return {
    score,
    detail: count > 0
      ? `Sequence match across ${count} joints`
      : "Not enough joint data"
  };
}

// ── TECHNIQUE 4: Pose embedding distance ─────────────────────────────────────
// Converts full skeleton to a flat vector and measures cosine similarity
// Catches overall body shape differences that angles miss

function poseToEmbedding(keypointMap) {
  const joints = [
    "left_shoulder","right_shoulder","left_elbow","right_elbow",
    "left_wrist","right_wrist","left_hip","right_hip",
    "left_knee","right_knee","left_ankle","right_ankle"
  ];
  const vec = [];
  for (const joint of joints) {
    const kp = keypointMap[joint];
    if (kp && (kp.score ?? 1) > 0.3) {
      vec.push(kp.x, kp.y);
    } else {
      vec.push(0, 0); // missing joint
    }
  }
  return vec;
}

function refFrameToEmbedding(frame) {
  const joints = [
    "left_shoulder","right_shoulder","left_elbow","right_elbow",
    "left_wrist","right_wrist","left_hip","right_hip",
    "left_knee","right_knee","left_ankle","right_ankle"
  ];
  const vec = [];
  for (const joint of joints) {
    const kp = frame.normalized_keypoints?.[joint];
    if (kp) {
      vec.push(kp[0] ?? 0, kp[1] ?? 0);
    } else {
      vec.push(0, 0);
    }
  }
  return vec;
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot  += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-6);
}

function computeEmbeddingScore(userKpMap, bestRefFrame) {
  const userEmb = poseToEmbedding(userKpMap);
  const refEmb  = refFrameToEmbedding(bestRefFrame);
  const sim     = cosineSimilarity(userEmb, refEmb);
  // Cosine similarity is -1 to 1, convert to 0-100
  const score   = Math.max(0, Math.min(100, ((sim + 1) / 2) * 100));
  return {
    score,
    similarity: Math.round(sim * 100) / 100,
    detail: `Body shape similarity: ${Math.round(score)}%`
  };
}

// ── TECHNIQUE 5: Joint velocity ───────────────────────────────────────────────
// Measures smoothness of movement — jerky = bad, fluid = good

class VelocityTracker {
  constructor() {
    this.prevAngles = null;
    this.velocities = {};
  }

  update(angles) {
    if (!this.prevAngles) {
      this.prevAngles = { ...angles };
      return null;
    }

    const newVelocities = {};
    for (const [name, val] of Object.entries(angles)) {
      const prev = this.prevAngles[name];
      if (prev != null) {
        newVelocities[name] = Math.abs(val - prev); // degrees per frame
      }
    }

    this.prevAngles = { ...angles };
    this.velocities = newVelocities;
    return newVelocities;
  }
}

export function createVelocityTracker() {
  return new VelocityTracker();
}

// Reference velocity — computed from reference frames
function computeRefVelocities(refFrames, activeAngles) {
  const activeNames = activeAngles.map(a => a.name);
  const refVelocities = {};

  for (const angleName of activeNames) {
    const values = refFrames.map(f => f.angles?.[angleName]).filter(v => v != null);
    if (values.length < 2) continue;
    let totalVel = 0;
    for (let i = 1; i < values.length; i++) {
      totalVel += Math.abs(values[i] - values[i-1]);
    }
    refVelocities[angleName] = totalVel / (values.length - 1);
  }

  return refVelocities;
}

function computeVelocityScore(currentVelocities, refVelocities, activeAngles) {
  if (!currentVelocities || Object.keys(currentVelocities).length === 0) {
    return { score: 75, detail: "Measuring movement speed..." };
  }

  const activeNames = activeAngles.map(a => a.name);
  let totalScore = 0, count = 0;
  const issues = [];

  for (const angleName of activeNames) {
    const userVel = currentVelocities[angleName];
    const refVel  = refVelocities[angleName];
    if (userVel == null || refVel == null) continue;

    // Compare speed — penalize if too fast or too slow
    const ratio = refVel > 0 ? userVel / refVel : 1;
    let jointScore;

    if (ratio > 3.0) {
      jointScore = 40; // way too fast — jerky
      issues.push(`${angleName.replace(/_/g," ")} moving too fast`);
    } else if (ratio > 2.0) {
      jointScore = 65; // too fast
    } else if (ratio < 0.2 && refVel > 2) {
      jointScore = 60; // too slow / not moving
      issues.push(`${angleName.replace(/_/g," ")} barely moving`);
    } else {
      jointScore = 100; // good speed
    }

    totalScore += jointScore;
    count++;
  }

  const score = count > 0 ? totalScore / count : 75;
  return {
    score,
    detail: issues.length > 0 ? issues.join(", ") : "Movement speed is good",
    issues,
  };
}

// ── TECHNIQUE 6: Body symmetry score ─────────────────────────────────────────
function computeSymmetryScore(userAngles) {
  let totalDiff = 0, count = 0;
  const issues = [];

  for (const [leftAngle, rightAngle] of SYMMETRY_PAIRS) {
    const left  = userAngles[leftAngle];
    const right = userAngles[rightAngle];
    if (left == null || right == null) continue;
    const diff = Math.abs(left - right);
    totalDiff += diff;
    count++;
    if (diff > 20) {
      const side = left > right ? "left" : "right";
      issues.push(`${side} side compensation detected`);
    }
  }

  const avgDiff = count > 0 ? totalDiff / count : 0;
  const score   = Math.max(0, Math.min(100, 100 - avgDiff * 1.5));

  return {
    score,
    detail: issues.length > 0 ? issues.join(", ") : "Good left/right balance",
    issues,
  };
}

// ── TECHNIQUE 7: Phase detection ─────────────────────────────────────────────
// Detects which phase of the movement the user is in
// and finds the matching reference frame for that phase

function detectPhase(angles, activeAngles) {
  if (activeAngles.length === 0) return "unknown";

  // Use the most active angle to determine phase
  const mostActive = activeAngles.reduce((a, b) => a.stdDev > b.stdDev ? a : b);
  const currentVal = angles[mostActive.name];
  if (currentVal == null) return "unknown";

  const mid = (mostActive.max + mostActive.min) / 2;

  if (currentVal > mostActive.max * 0.9) return "peak_extended";
  if (currentVal < mostActive.min * 1.1) return "peak_contracted";
  if (currentVal > mid) return "extending";
  return "contracting";
}

function computePhaseScore(userAngles, refFrames, activeAngles) {
  if (activeAngles.length === 0) return { score: 75, detail: "No active joints" };

  const userPhase = detectPhase(userAngles, activeAngles);
  if (userPhase === "unknown") return { score: 75, detail: "Phase unknown" };

  // Find reference frames in the same phase
  const phaseFrames = refFrames.filter(f => {
    const refAngles = f.angles ?? {};
    const refPhase  = detectPhase(refAngles, activeAngles);
    return refPhase === userPhase;
  });

  if (phaseFrames.length === 0) {
    return { score: 50, detail: `Phase mismatch: user is ${userPhase}` };
  }

  // Score based on how close user is to reference in this phase
  const mostActive = activeAngles.reduce((a, b) => a.stdDev > b.stdDev ? a : b);
  const userVal    = userAngles[mostActive.name];
  const refVals    = phaseFrames
    .map(f => f.angles?.[mostActive.name])
    .filter(v => v != null);

  if (refVals.length === 0) return { score: 75, detail: "Phase matched" };

  const refMean = refVals.reduce((a,b) => a+b, 0) / refVals.length;
  const diff    = Math.abs(userVal - refMean);
  const score   = Math.max(0, Math.min(100, 100 - diff * 1.5));

  return {
    score,
    phase:  userPhase,
    detail: `Phase: ${userPhase.replace(/_/g," ")} — ${Math.round(score)}% match`,
  };
}

// ── WRONG EXERCISE DETECTION ─────────────────────────────────────────────────
function detectWrongExercise(userAngles, activeAngles, embeddingScore, angleAvgDiff) {
  const activeNames = activeAngles.map(a => a.name);
  let userHasActive = 0;
  for (const name of activeNames) {
    if (userAngles[name] != null) userHasActive++;
  }
  const coverage = activeNames.length > 0
    ? userHasActive / activeNames.length : 0;

  // Much stricter — needs ALL three conditions to be true
  return (
    coverage < 0.25 &&           // less than 25% joints visible
    embeddingScore < 25 &&        // body shape very different
    angleAvgDiff > 70             // angles very far off
  );
}

// ── BEST FRAME FINDER ────────────────────────────────────────────────────────
// Replace findBestRefFrame in poseUtils.js
function findBestRefFrame(userAngles, refFrames, activeAngles) {
  if (!refFrames || refFrames.length === 0) return refFrames?.[0] ?? null;

  const activeNames = activeAngles.length > 0
    ? activeAngles.map(a => a.name)
    : Object.keys(ANGLE_TRIPLETS);

  let bestFrame = refFrames[0];
  let bestDiff  = Infinity;
  let bestCount = 0;

  for (const frame of refFrames) {
    let total = 0, count = 0;
    for (const name of activeNames) {
      const ref  = frame.angles?.[name];
      const user = userAngles[name];
      if (ref == null || user == null) continue;
      total += Math.abs(user - ref);
      count++;
    }
    if (count === 0) continue;
    const avg = total / count;
    if (avg < bestDiff) {
      bestDiff  = avg;
      bestFrame = frame;
      bestCount = count;
    }
  }

  // If less than 40% of active joints matched — no reliable frame found
  const minRequired = Math.ceil(activeNames.length * 0.4);
  if (bestCount < minRequired) return null;

  return bestFrame;
}

// ── MASTER COMPARISON FUNCTION ───────────────────────────────────────────────
// This is what UploadMode and WebcamMode call every frame

export function compareAgainstMotion(
  userAngles,
  userKpMap,
  refFrames,
  activeAngles,
  userBuffer,       // SequenceBuffer instance
  velocityTracker,  // VelocityTracker instance
  refVelocities     // precomputed from reference
) {
  // ── Find best matching reference frame ────────────────────────────────────
  const bestFrame = findBestRefFrame(userAngles, refFrames, activeAngles);
  if (!bestFrame) {
    return {
      finalScore:   0,
      breakdown:    {},
      differences:  {},
      wrongExercise: true,
      feedback:     [{ message: "No reference motion found", severity: "error" }]
    };
  }

  // ── Run all 6 techniques ─────────────────────────────────────────────────

  // 1. Angle score
  const angleResult = computeAngleScore(userAngles, bestFrame, activeAngles);

  // 2. DTW score
  if (userBuffer) userBuffer.push(userAngles);
  const dtwResult = computeDTWScore(userBuffer, refFrames, activeAngles);

  // 3. Embedding score
  const embResult = computeEmbeddingScore(userKpMap, bestFrame);

  // 4. Velocity score
  const currentVels = velocityTracker ? velocityTracker.update(userAngles) : null;
  const velResult   = computeVelocityScore(currentVels, refVelocities ?? {}, activeAngles);

  // 5. Symmetry score
  const symResult = computeSymmetryScore(userAngles);

  // 6. Phase score
  const phaseResult = computePhaseScore(userAngles, refFrames, activeAngles);

  // ── Wrong exercise detection ──────────────────────────────────────────────
  const wrongExercise = detectWrongExercise(
  userAngles, activeAngles, embResult.score, angleResult.avgDiff
);

  // ── Weighted final score ──────────────────────────────────────────────────
  const finalScore = wrongExercise ? 0 : Math.round(
    angleResult.score     * WEIGHTS.angle     +
    dtwResult.score       * WEIGHTS.dtw       +
    embResult.score       * WEIGHTS.embedding +
    velResult.score       * WEIGHTS.velocity  +
    symResult.score       * WEIGHTS.symmetry  +
    phaseResult.score     * WEIGHTS.phase
  );

  const breakdown = {
    angle:     { score: Math.round(angleResult.score),    weight: "25%", detail: `Avg angle diff: ${Math.round(angleResult.avgDiff)}°` },
    dtw:       { score: Math.round(dtwResult.score),      weight: "25%", detail: dtwResult.detail },
    embedding: { score: Math.round(embResult.score),      weight: "20%", detail: embResult.detail },
    velocity:  { score: Math.round(velResult.score),      weight: "15%", detail: velResult.detail },
    symmetry:  { score: Math.round(symResult.score),      weight: "10%", detail: symResult.detail },
    phase:     { score: Math.round(phaseResult.score),    weight: "5%",  detail: phaseResult.detail },
  };

  // ── Generate feedback from all techniques ─────────────────────────────────
  const feedback = generateCombinedFeedback(
    angleResult.differences,
    velResult,
    symResult,
    phaseResult,
    wrongExercise
  );

  return {
    finalScore,
    breakdown,
    differences:   angleResult.differences,
    wrongExercise,
    feedback,
    phase:         phaseResult.phase,
  };
}

// ── COMBINED FEEDBACK ────────────────────────────────────────────────────────
const ANGLE_FEEDBACK_RULES = [
  { angle: "left_elbow_angle",    check: (d,u,r) => u > r+15, message: "Bend your left elbow more",       severity: "error"   },
  { angle: "left_elbow_angle",    check: (d,u,r) => u < r-15, message: "Straighten your left elbow",      severity: "error"   },
  { angle: "right_elbow_angle",   check: (d,u,r) => u > r+15, message: "Bend your right elbow more",      severity: "error"   },
  { angle: "right_elbow_angle",   check: (d,u,r) => u < r-15, message: "Straighten your right elbow",     severity: "error"   },
  { angle: "left_shoulder_angle", check: (d,u,r) => u < r-15, message: "Raise your left arm higher",      severity: "error"   },
  { angle: "left_shoulder_angle", check: (d,u,r) => u > r+15, message: "Lower your left arm",             severity: "warning" },
  { angle: "right_shoulder_angle",check: (d,u,r) => u < r-15, message: "Raise your right arm higher",     severity: "error"   },
  { angle: "right_shoulder_angle",check: (d,u,r) => u > r+15, message: "Lower your right arm",            severity: "warning" },
  { angle: "left_knee_angle",     check: (d,u,r) => u > r+15, message: "Bend your left knee more",        severity: "error"   },
  { angle: "left_knee_angle",     check: (d,u,r) => u < r-15, message: "Straighten your left leg",        severity: "warning" },
  { angle: "right_knee_angle",    check: (d,u,r) => u > r+15, message: "Bend your right knee more",       severity: "error"   },
  { angle: "right_knee_angle",    check: (d,u,r) => u < r-15, message: "Straighten your right leg",       severity: "warning" },
  { angle: "left_hip_angle",      check: (d,u,r) => d > 15,   message: "Adjust your hip alignment",       severity: "warning" },
  { angle: "right_hip_angle",     check: (d,u,r) => d > 15,   message: "Keep your back straight",         severity: "warning" },
];

function generateCombinedFeedback(differences, velResult, symResult, phaseResult, wrongExercise) {
  if (wrongExercise) {
    return [{ message: "Wrong exercise — does not match reference video", severity: "error" }];
  }

  const feedback = [];

  // Angle feedback
  for (const rule of ANGLE_FEEDBACK_RULES) {
    const d = differences[rule.angle];
    if (!d) continue;
    if (rule.check(d.diff, d.user, d.ref)) {
      if (!feedback.find(f => f.message === rule.message)) {
        feedback.push({ message: rule.message, severity: rule.severity });
      }
    }
  }

  // Velocity feedback
  if (velResult.issues?.length > 0) {
    feedback.push({ message: velResult.issues[0], severity: "warning" });
  }

  // Symmetry feedback
  if (symResult.issues?.length > 0) {
    feedback.push({ message: symResult.issues[0], severity: "warning" });
  }

  // Phase feedback
  if (phaseResult.score < 50 && phaseResult.detail) {
    feedback.push({ message: phaseResult.detail, severity: "warning" });
  }

  if (feedback.length === 0) {
    feedback.push({ message: "Great form! Keep it up!", severity: "success" });
  }

  return feedback.sort((a, b) => {
    const order = { error: 0, warning: 1, success: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ── PRECOMPUTE REFERENCE DATA ─────────────────────────────────────────────────
// Call this ONCE when reference motion loads — pass result to each frame
export function precomputeRefData(refFrames) {
  const activeAngles   = getActiveAngles(refFrames);
  const exerciseType   = classifyExerciseType(refFrames);
  const refVelocities  = computeRefVelocities(refFrames, activeAngles);
  return { activeAngles, exerciseType, refVelocities };
}


// ── CANVAS DRAWING ────────────────────────────────────────────────────────────
export function drawSkeleton(ctx, keypointMap, differences = {}) {
  for (const [a, b] of SKELETON_CONNECTIONS) {
    const pa = keypointMap[a];
    const pb = keypointMap[b];
    if (!pa || !pb || (pa.score ?? 1) < 0.3 || (pb.score ?? 1) < 0.3) continue;
    const relatedAngles = Object.entries(differences).filter(([name]) =>
      ANGLE_TRIPLETS[name]?.includes(a) || ANGLE_TRIPLETS[name]?.includes(b)
    );
    const maxDiff = relatedAngles.length
      ? Math.max(...relatedAngles.map(([, d]) => d.diff))
      : 0;
    ctx.strokeStyle = maxDiff > 25 ? "#ff4444" : maxDiff > 12 ? "#ffaa00" : "#44ff44";
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  for (const kp of Object.values(keypointMap)) {
    if ((kp.score ?? 1) < 0.3) continue;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }
}





// // src/utils/poseUtils.js

// // ── Joint definitions ────────────────────────────────────────────────────────
// // MoveNet keypoint indices
// export const KEYPOINT_NAMES = [
//   "nose", "left_eye", "right_eye", "left_ear", "right_ear",
//   "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
//   "left_wrist", "right_wrist", "left_hip", "right_hip",
//   "left_knee", "right_knee", "left_ankle", "right_ankle"
// ];

// export const ANGLE_TRIPLETS = {
//   left_elbow_angle:     ["left_shoulder",  "left_elbow",    "left_wrist"],
//   right_elbow_angle:    ["right_shoulder", "right_elbow",   "right_wrist"],
//   left_shoulder_angle:  ["left_elbow",     "left_shoulder", "left_hip"],
//   right_shoulder_angle: ["right_elbow",    "right_shoulder","right_hip"],
//   left_knee_angle:      ["left_hip",       "left_knee",     "left_ankle"],
//   right_knee_angle:     ["right_hip",      "right_knee",    "right_ankle"],
//   left_hip_angle:       ["left_shoulder",  "left_hip",      "left_knee"],
//   right_hip_angle:      ["right_shoulder", "right_hip",     "right_knee"],
// };

// // Skeleton connections for drawing
// export const SKELETON_CONNECTIONS = [
//   ["left_shoulder",  "right_shoulder"],
//   ["left_shoulder",  "left_elbow"],
//   ["left_elbow",     "left_wrist"],
//   ["right_shoulder", "right_elbow"],
//   ["right_elbow",    "right_wrist"],
//   ["left_shoulder",  "left_hip"],
//   ["right_shoulder", "right_hip"],
//   ["left_hip",       "right_hip"],
//   ["left_hip",       "left_knee"],
//   ["left_knee",      "left_ankle"],
//   ["right_hip",      "right_knee"],
//   ["right_knee",     "right_ankle"],
// ];

// // ── Core math ────────────────────────────────────────────────────────────────
// export function computeAngle(a, b, c) {
//   const ba = { x: a.x - b.x, y: a.y - b.y };
//   const bc = { x: c.x - b.x, y: c.y - b.y };
//   const dot    = ba.x * bc.x + ba.y * bc.y;
//   const magBA  = Math.sqrt(ba.x ** 2 + ba.y ** 2);
//   const magBC  = Math.sqrt(bc.x ** 2 + bc.y ** 2);
//   const cosine = dot / (magBA * magBC + 1e-6);
//   return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
// }

// export function keypointsToMap(keypoints) {
//   // Convert TF.js keypoints array → { name: {x, y, score} }
//   const map = {};
//   keypoints.forEach(kp => { map[kp.name] = kp; });
//   return map;
// }

// export function extractAngles(keypointMap) {
//   const angles = {};
//   for (const [angleName, [a, b, c]] of Object.entries(ANGLE_TRIPLETS)) {
//     const pa = keypointMap[a];
//     const pb = keypointMap[b];
//     const pc = keypointMap[c];
//     // Only compute if all joints are visible (score > 0.3)
//     if (pa?.score > 0.3 && pb?.score > 0.3 && pc?.score > 0.3) {
//       angles[angleName] = computeAngle(pa, pb, pc);
//     }
//   }
//   return angles;
// }

// export function normalizePose(keypointMap) {
//   const lh = keypointMap["left_hip"];
//   const rh = keypointMap["right_hip"];
//   const ls = keypointMap["left_shoulder"];
//   const rs = keypointMap["right_shoulder"];

//   if (!lh || !rh || !ls || !rs) return keypointMap;

//   const cx = (lh.x + rh.x) / 2;
//   const cy = (lh.y + rh.y) / 2;
//   const scx = (ls.x + rs.x) / 2;
//   const scy = (ls.y + rs.y) / 2;
//   const scale = Math.sqrt((scx - cx) ** 2 + (scy - cy) ** 2) || 1;

//   const normalized = {};
//   for (const [name, kp] of Object.entries(keypointMap)) {
//     normalized[name] = {
//       ...kp,
//       x: (kp.x - cx) / scale,
//       y: (kp.y - cy) / scale,
//     };
//   }
//   return normalized;
// }

// // ── Step 5: Angle comparison ─────────────────────────────────────────────────
// // Add this to poseUtils.js — replaces the old compareAngles

// /**
//  * Find the closest matching reference frame to the user's current frame.
//  * This is simplified DTW — finds which point in the reference motion
//  * the user is currently at, then compares angles at that point.
//  */
// export function findBestRefFrame(userAngles, refFrames) {
//   if (!refFrames || refFrames.length === 0) return null;

//   let bestFrame = refFrames[0];
//   let bestDiff  = Infinity;

//   for (const frame of refFrames) {
//     let totalDiff = 0;
//     let count     = 0;
//     for (const [angleName, userVal] of Object.entries(userAngles)) {
//       const refVal = frame.angles?.[angleName];
//       if (refVal !== undefined) {
//         totalDiff += Math.abs(userVal - refVal);
//         count++;
//       }
//     }
//     const avgDiff = count > 0 ? totalDiff / count : Infinity;
//     if (avgDiff < bestDiff) {
//       bestDiff  = avgDiff;
//       bestFrame = frame;
//     }
//   }

//   return { frame: bestFrame, avgDiff: bestDiff };
// }

// /**
//  * Compare user angles against the best matching reference frame.
//  * Returns score 0-100 and per-joint differences.
//  */
// export function compareAgainstMotion(userAngles, refFrames) {
//   const best = findBestRefFrame(userAngles, refFrames);
//   if (!best) return { score: 0, differences: {}, avgDiff: 90 };

//   const refAngles  = best.frame.angles ?? {};
//   const differences = {};
//   let totalDiff = 0;
//   let count     = 0;

//   for (const [angleName, refVal] of Object.entries(refAngles)) {
//     const userVal = userAngles[angleName];
//     if (userVal === undefined) continue;
//     const diff = Math.abs(refVal - userVal);
//     differences[angleName] = { ref: refVal, user: userVal, diff };
//     totalDiff += diff;
//     count++;
//   }

//   const avgDiff = count > 0 ? totalDiff / count : 90;
//   const score   = Math.max(0, Math.round(100 - (avgDiff / 90) * 100));

//   return { score, differences, avgDiff };
// }

// // ── Step 6: Rule-based feedback ──────────────────────────────────────────────
// // Replace FEEDBACK_RULES and generateFeedback in poseUtils.js

// const FEEDBACK_RULES = [
//   // Elbow rules
//   {
//     angle: "left_elbow_angle",
//     check: (diff, user, ref) => user > ref + 15,
//     message: "Bend your left elbow more",
//     severity: "error",
//   },
//   {
//     angle: "left_elbow_angle",
//     check: (diff, user, ref) => user < ref - 15,
//     message: "Straighten your left elbow more",
//     severity: "error",
//   },
//   {
//     angle: "right_elbow_angle",
//     check: (diff, user, ref) => user > ref + 15,
//     message: "Bend your right elbow more",
//     severity: "error",
//   },
//   {
//     angle: "right_elbow_angle",
//     check: (diff, user, ref) => user < ref - 15,
//     message: "Straighten your right elbow more",
//     severity: "error",
//   },
//   // Shoulder rules
//   {
//     angle: "left_shoulder_angle",
//     check: (diff, user, ref) => user < ref - 15,
//     message: "Raise your left arm higher",
//     severity: "error",
//   },
//   {
//     angle: "left_shoulder_angle",
//     check: (diff, user, ref) => user > ref + 15,
//     message: "Lower your left arm",
//     severity: "warning",
//   },
//   {
//     angle: "right_shoulder_angle",
//     check: (diff, user, ref) => user < ref - 15,
//     message: "Raise your right arm higher",
//     severity: "error",
//   },
//   {
//     angle: "right_shoulder_angle",
//     check: (diff, user, ref) => user > ref + 15,
//     message: "Lower your right arm",
//     severity: "warning",
//   },
//   // Knee rules
//   {
//     angle: "left_knee_angle",
//     check: (diff, user, ref) => user > ref + 15,
//     message: "Bend your left knee more",
//     severity: "error",
//   },
//   {
//     angle: "left_knee_angle",
//     check: (diff, user, ref) => user < ref - 15,
//     message: "Straighten your left leg",
//     severity: "warning",
//   },
//   {
//     angle: "right_knee_angle",
//     check: (diff, user, ref) => user > ref + 15,
//     message: "Bend your right knee more",
//     severity: "error",
//   },
//   {
//     angle: "right_knee_angle",
//     check: (diff, user, ref) => user < ref - 15,
//     message: "Straighten your right leg",
//     severity: "warning",
//   },
//   // Hip rules
//   {
//     angle: "left_hip_angle",
//     check: (diff, user, ref) => diff > 15,
//     message: "Adjust your left hip position",
//     severity: "warning",
//   },
//   {
//     angle: "right_hip_angle",
//     check: (diff, user, ref) => diff > 15,
//     message: "Keep your back straight",
//     severity: "warning",
//   },
// ];

// export function generateFeedback(differences) {
//   const feedback = [];
//   for (const rule of FEEDBACK_RULES) {
//     const d = differences[rule.angle];
//     if (!d) continue;
//     if (rule.check(d.diff, d.user, d.ref)) {
//       // Avoid duplicate messages
//       if (!feedback.find(f => f.message === rule.message)) {
//         feedback.push({
//           message:  rule.message,
//           severity: rule.severity,
//           angle:    rule.angle,
//           diff:     d.diff,
//         });
//       }
//     }
//   }
//   if (feedback.length === 0) {
//     feedback.push({
//       message:  "Great form! Keep it up!",
//       severity: "success",
//       angle:    null,
//       diff:     0,
//     });
//   }
//   // Sort: errors first, then warnings
//   return feedback.sort((a, b) => {
//     const order = { error: 0, warning: 1, success: 2 };
//     return order[a.severity] - order[b.severity];
//   });
// }

// // ── Step 7: Canvas drawing ───────────────────────────────────────────────────
// export function drawSkeleton(ctx, keypointMap, differences = {}, scale = 1) {
//   // Draw connections
//   for (const [a, b] of SKELETON_CONNECTIONS) {
//     const pa = keypointMap[a];
//     const pb = keypointMap[b];
//     if (!pa || !pb || pa.score < 0.3 || pb.score < 0.3) continue;

//     // Color based on worst angle involving these joints
//     const relatedAngles = Object.entries(differences).filter(([name]) =>
//       ANGLE_TRIPLETS[name]?.includes(a) || ANGLE_TRIPLETS[name]?.includes(b)
//     );
//     const maxDiff = relatedAngles.length
//       ? Math.max(...relatedAngles.map(([, d]) => d.diff))
//       : 0;

//     ctx.strokeStyle = maxDiff > 25 ? "#ff4444" : maxDiff > 12 ? "#ffaa00" : "#44ff44";
//     ctx.lineWidth   = 3;
//     ctx.beginPath();
//     ctx.moveTo(pa.x * scale, pa.y * scale);
//     ctx.lineTo(pb.x * scale, pb.y * scale);
//     ctx.stroke();
//   }

//   // Draw joint dots
//   for (const kp of Object.values(keypointMap)) {
//     if (kp.score < 0.3) continue;
//     ctx.fillStyle = "#ffffff";
//     ctx.beginPath();
//     ctx.arc(kp.x * scale, kp.y * scale, 5, 0, 2 * Math.PI);
//     ctx.fill();
//   }
// }

// // ── Repetition counter ───────────────────────────────────────────────────────
// export function createRepCounter(angleName, upThreshold = 160, downThreshold = 90) {
//   let stage = "up";   // "up" | "down"
//   let reps  = 0;

//   return function tick(angles) {
//     const angle = angles[angleName];
//     if (angle === undefined) return reps;

//     if (angle > upThreshold)  stage = "up";
//     if (angle < downThreshold && stage === "up") {
//       stage = "down";
//       reps++;
//     }
//     return reps;
//   };
// }