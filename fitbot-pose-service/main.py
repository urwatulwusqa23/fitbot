# main.py — FitBot Pose Service
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import mediapipe as mp
import numpy as np
import cv2
import os
import tempfile
import yt_dlp

app = FastAPI(title="FitBot Pose Service")

mp_pose = mp.solutions.pose

# ── Joint definitions ────────────────────────────────────────────────────────
JOINT_INDICES = {
    "left_shoulder":  11, "right_shoulder": 12,
    "left_elbow":     13, "right_elbow":    14,
    "left_wrist":     15, "right_wrist":    16,
    "left_hip":       23, "right_hip":      24,
    "left_knee":      25, "right_knee":     26,
    "left_ankle":     27, "right_ankle":    28,
}

ANGLE_TRIPLETS = {
    "left_elbow_angle":     ("left_shoulder",  "left_elbow",    "left_wrist"),
    "right_elbow_angle":    ("right_shoulder", "right_elbow",   "right_wrist"),
    "left_shoulder_angle":  ("left_elbow",     "left_shoulder", "left_hip"),
    "right_shoulder_angle": ("right_elbow",    "right_shoulder","right_hip"),
    "left_knee_angle":      ("left_hip",       "left_knee",     "left_ankle"),
    "right_knee_angle":     ("right_hip",      "right_knee",    "right_ankle"),
    "left_hip_angle":       ("left_shoulder",  "left_hip",      "left_knee"),
    "right_hip_angle":      ("right_shoulder", "right_hip",     "right_knee"),
}

# ── Math helpers ─────────────────────────────────────────────────────────────
def compute_angle(a, b, c):
    ba = np.array(a) - np.array(b)
    bc = np.array(c) - np.array(b)
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return round(float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0)))), 2)

def normalize_pose(keypoints: dict) -> dict:
    lh = np.array(keypoints.get("left_hip",  [0, 0]))
    rh = np.array(keypoints.get("right_hip", [0, 0]))
    ls = np.array(keypoints.get("left_shoulder",  [0, 0]))
    rs = np.array(keypoints.get("right_shoulder", [0, 0]))
    center = (lh + rh) / 2
    scale  = np.linalg.norm((ls + rs) / 2 - center) + 1e-6
    return {k: (((np.array(v) - center) / scale).tolist()) for k, v in keypoints.items()}

# ── Download YouTube video ───────────────────────────────────────────────────
def download_youtube_video(youtube_url: str, output_path: str) -> str:
    """
    Downloads a YouTube video to a temp folder using yt-dlp.
    Returns the path of the downloaded file.
    Chooses lowest quality to save time and disk space.
    """
    ydl_opts = {
        "format":    "worst[ext=mp4]/worst",   # lowest quality is fine for pose
        "outtmpl":   output_path,
        "quiet":     True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])
    return output_path

# ── Frame processing ─────────────────────────────────────────────────────────
def process_single_frame(pose, frame_bgr, frame_w, frame_h):
    rgb     = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb)
    if not results.pose_landmarks:
        return None

    lm = results.pose_landmarks.landmark
    keypoints = {}
    for name, idx in JOINT_INDICES.items():
        pt = lm[idx]
        if pt.visibility < 0.5:
            continue
        keypoints[name] = {
            "x":          round(pt.x * frame_w, 2),
            "y":          round(pt.y * frame_h, 2),
            "visibility": round(pt.visibility, 3),
        }

    if len(keypoints) < 6:
        return None

    angles = {}
    for angle_name, (a, b, c) in ANGLE_TRIPLETS.items():
        if all(k in keypoints for k in [a, b, c]):
            pa = [keypoints[a]["x"], keypoints[a]["y"]]
            pb = [keypoints[b]["x"], keypoints[b]["y"]]
            pc = [keypoints[c]["x"], keypoints[c]["y"]]
            angles[angle_name] = compute_angle(pa, pb, pc)

    raw_coords = {k: [v["x"], v["y"]] for k, v in keypoints.items()}
    normalized = normalize_pose(raw_coords)

    return {
        "keypoints":            keypoints,
        "angles":               angles,
        "normalized_keypoints": normalized,
    }

def process_video_file(video_path: str, sample_rate: int = 5) -> dict:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps   = cap.get(cv2.CAP_PROP_FPS)
    w     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    frames_data = []
    frame_idx   = 0

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        min_detection_confidence=0.5,
    ) as pose:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % sample_rate == 0:
                result = process_single_frame(pose, frame, w, h)
                if result:
                    # Store normalized time position (0.0 to 1.0)
                    # so browser can map frame to video timestamp
                    frames_data.append({
                        "frame_index":    frame_idx,
                        "time_position":  round(frame_idx / max(total, 1), 4),
                        **result
                    })
            frame_idx += 1

    cap.release()

    if not frames_data:
        raise ValueError("No pose detected in video.")

    return {
        "fps":           fps,
        "total_frames":  total,
        "width":         w,
        "height":        h,
        "frames":        frames_data,
        "motion_pattern": build_motion_pattern(frames_data),
    }

def build_motion_pattern(frames_data: list) -> dict:
    sequences = {}
    for frame in frames_data:
        for angle_name, value in frame["angles"].items():
            sequences.setdefault(angle_name, []).append(value)
    pattern = {}
    for name, values in sequences.items():
        arr = np.array(values)
        pattern[name] = {
            "mean":     round(float(np.mean(arr)), 2),
            "std":      round(float(np.std(arr)),  2),
            "min":      round(float(np.min(arr)),  2),
            "max":      round(float(np.max(arr)),  2),
            "sequence": [round(v, 2) for v in values],
        }
    return pattern

# ── API Models ───────────────────────────────────────────────────────────────
class ProcessYouTubeRequest(BaseModel):
    video_id:     int
    youtube_url:  str
    exercise_name: str
    sample_rate:  int = 5

class ProcessUploadedRequest(BaseModel):
    video_path:   str
    exercise_name: str
    sample_rate:  int = 5

# ── Endpoints ────────────────────────────────────────────────────────────────
@app.post("/api/process-youtube")
async def process_youtube(req: ProcessYouTubeRequest):
    """
    Called by .NET when a user requests pose analysis for a YouTube video.
    Downloads the video, extracts pose from every Nth frame,
    deletes the temp file, returns the full motion data.
    """
    tmp_path = None
    try:
        # Create a temp file path
        tmp_dir  = tempfile.gettempdir()
        tmp_path = os.path.join(tmp_dir, f"fitbot_{req.video_id}.mp4")

        # Download YouTube video
        download_youtube_video(req.youtube_url, tmp_path)

        if not os.path.exists(tmp_path):
            raise ValueError("Video download failed — file not created.")

        # Process all frames
        result = process_video_file(tmp_path, req.sample_rate)

        return {
            "success":       True,
            "video_id":      req.video_id,
            "exercise_name": req.exercise_name,
            **result
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always delete the temp video file to save disk space
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/process-uploaded-video")
async def process_uploaded_video(req: ProcessUploadedRequest):
    """
    Called by .NET when a user uploads their own exercise video.
    .NET saves the file to temp, sends path here,
    we process and return frame-by-frame analysis.
    """
    try:
        result = process_video_file(req.video_path, req.sample_rate)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "service": "FitBot Pose Service"}