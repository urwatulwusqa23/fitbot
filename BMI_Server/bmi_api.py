"""
bmi_api.py  —  Combined BMI Flask API
Primary:  DenseNet121 deep learning (requires best_bmi_model.pt in same folder)
Fallback: MediaPipe pose estimation (always available)

Run: python bmi_api.py
Endpoint: POST http://localhost:5050/predict-bmi
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import os
import urllib.request
import warnings

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
MODEL_PT_PATH   = "./best_bmi_model.pt"           # DenseNet model (downloaded from Colab)
POSE_MODEL_PATH = "./pose_landmarker_heavy.task"  # MediaPipe model

# ─────────────────────────────────────────────────────────────────────────────
# SHARED BMI CATEGORY HELPER
# ─────────────────────────────────────────────────────────────────────────────
BMI_RANGES = [
    (0,    18.5, "Underweight",    "#3498db"),
    (18.5, 25.0, "Normal weight",  "#2ecc71"),
    (25.0, 30.0, "Overweight",     "#f39c12"),
    (30.0, 35.0, "Obese Class I",  "#e74c3c"),
    (35.0, 999,  "Obese Class II+","#8e44ad"),
]

def bmi_cat(b):
    for lo, hi, label, col in BMI_RANGES:
        if lo <= b < hi:
            return label, col
    return "Obese Class II+", "#8e44ad"


# =============================================================================
# PRIMARY METHOD: DenseNet121 Deep Learning
# =============================================================================
dl_model     = None
dl_device    = None
dl_transform = None
dl_available = False


def _build_densenet121(device):
    import torch.nn as nn
    import torchvision.models as models
    model = models.densenet121(weights=None)
    in_f  = model.classifier.in_features
    model.classifier = nn.Sequential(
        nn.Linear(in_f, 256), nn.ReLU(), nn.Dropout(0.2), nn.Linear(256, 1))
    return model

def _build_efficientnet_b4(device):
    import torch.nn as nn
    import torchvision.models as models
    model = models.efficientnet_b4(weights=None)
    in_f  = model.classifier[1].in_features  # 1792
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4, inplace=True),
        nn.Linear(in_f, 512),
        nn.BatchNorm1d(512),
        nn.GELU(),
        nn.Dropout(p=0.3),
        nn.Linear(512, 1),
    )
    return model

def load_deep_learning_model():
    global dl_model, dl_device, dl_transform, dl_available

    if not os.path.exists(MODEL_PT_PATH):
        print(f"[DL] '{MODEL_PT_PATH}' not found — deep learning DISABLED.")
        print("[DL] Train the model in Colab and copy best_bmi_model.pt here to enable it.")
        return

    try:
        import torch
        import torchvision.transforms as T

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Load checkpoint — new format stores architecture name, old format is raw state_dict
        raw = torch.load(MODEL_PT_PATH, map_location=device, weights_only=False)
        if isinstance(raw, dict) and "architecture" in raw:
            arch       = raw["architecture"]
            state_dict = raw["model_state_dict"]
            saved_mae  = raw.get("val_mae", "?")
        else:
            arch       = "densenet121"   # old model file (no metadata)
            state_dict = raw
            saved_mae  = "?"

        print(f"[DL] Loading {arch} on {device}  (saved Val MAE: {saved_mae}) ...")

        if arch == "efficientnet_b4":
            model = _build_efficientnet_b4(device)
        else:
            model = _build_densenet121(device)

        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()

        # Shared normalisation transform (used for each TTA crop)
        normalize = T.Compose([
            T.ToTensor(),
            T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        dl_model     = model
        dl_device    = device
        dl_transform = normalize   # crops are applied separately in predict fn
        dl_available = True
        print(f"[DL] {arch} ready — deep learning ENABLED.")

    except Exception as e:
        print(f"[DL] Load failed: {e}")
        print("[DL] Deep learning DISABLED — will use pose fallback.")


def _tta_crops(pil_img):
    """Return 3 deterministic crops for test-time augmentation."""
    import torchvision.transforms.functional as TF
    crops = []
    resized = TF.resize(pil_img, [256, 256])
    # 1. centre crop
    crops.append(TF.center_crop(resized, [224, 224]))
    # 2. horizontally-flipped centre crop
    crops.append(TF.hflip(TF.center_crop(resized, [224, 224])))
    # 3. slightly zoomed-out crop (top-centre)
    big = TF.resize(pil_img, [280, 280])
    crops.append(TF.center_crop(big, [224, 224]))
    return crops

def predict_bmi_deep_learning(img_bgr, known_height_cm=None):
    import torch
    from PIL import Image as PILImage

    rgb     = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil_img = PILImage.fromarray(rgb)

    # 3-crop TTA: average predictions to reduce variance
    tensors = torch.stack([dl_transform(c) for c in _tta_crops(pil_img)]).to(dl_device)
    with torch.no_grad():
        bmi_raw = float(dl_model(tensors).mean().item())

    bmi_pred = float(np.clip(bmi_raw, 12.0, 55.0))
    ci_half  = 2.5
    bmi_lo   = round(max(bmi_pred - ci_half, 10.0), 1)
    bmi_hi   = round(min(bmi_pred + ci_half, 60.0), 1)
    bmi_pred = round(bmi_pred, 1)

    if known_height_cm:
        h_m        = float(known_height_cm) / 100.0
        weight_est = round(bmi_pred * h_m * h_m, 1)
        height_out = float(known_height_cm)
    else:
        weight_est = None
        height_out = None

    label, col = bmi_cat(bmi_pred)
    return {
        "bmi":            bmi_pred,
        "bmi_lo":         bmi_lo,
        "bmi_hi":         bmi_hi,
        "height_cm":      height_out,
        "weight_kg":      weight_est,
        "category":       label,
        "cat_color":      col,
        "method":         "deep_learning",
        "low_visibility": False,
    }


# =============================================================================
# FALLBACK METHOD: MediaPipe Pose Estimation
# =============================================================================
pose_ready    = False
pose_detector = None   # cached at startup — not recreated per request
pose_scaler   = None
pose_bmi_gbr  = pose_bmi_rf = None
pose_ht_gbr   = pose_ht_rf  = None
pose_wt_gbr   = pose_wt_rf  = None

POSE_FEAT = [
    "shoulder_ratio","hip_ratio","waist_ratio","torso_ratio",
    "leg_ratio","neck_ratio","arm_ratio","thigh_ratio",
    "shoulder_hip_ratio","waist_hip_ratio","bri_proxy",
]


def setup_pose_models():
    global pose_ready, pose_scaler, pose_detector
    global pose_bmi_gbr, pose_bmi_rf
    global pose_ht_gbr,  pose_ht_rf
    global pose_wt_gbr,  pose_wt_rf

    # Download MediaPipe model if needed
    if not os.path.exists(POSE_MODEL_PATH):
        print("[Pose] Downloading MediaPipe pose model (~28 MB)...")
        urllib.request.urlretrieve(
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
            "pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
            POSE_MODEL_PATH,
        )
        print("[Pose] Download complete.")

    try:
        import mediapipe as mp
        from mediapipe.tasks import python as mp_tasks
        from mediapipe.tasks.python import vision as mp_vision
        import pandas as pd
        from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import train_test_split

        # Create the PoseLandmarker once and cache it for all requests
        print("[Pose] Initialising MediaPipe PoseLandmarker ...")
        base_opts = mp_tasks.BaseOptions(model_asset_path=POSE_MODEL_PATH)
        opts = mp_vision.PoseLandmarkerOptions(
            base_options=base_opts,
            output_segmentation_masks=False,
            min_pose_detection_confidence=0.45,
            min_pose_presence_confidence=0.45,
            min_tracking_confidence=0.45,
            num_poses=1,
        )
        pose_detector = mp_vision.PoseLandmarker.create_from_options(opts)
        print("[Pose] PoseLandmarker cached.")

        print("[Pose] Generating NHANES synthetic data and training ensemble ...")
        np.random.seed(42)

        rows = []
        for _ in range(10000):
            sex    = np.random.choice(["M", "F"])
            height = np.clip(np.random.normal(175.7 if sex=="M" else 161.8,
                                              7.1   if sex=="M" else 6.8), 145, 205)
            bmi    = np.clip(np.random.lognormal(
                        np.log(29.1 if sex=="M" else 29.6) - 0.08, 0.22), 14.0, 55.0)
            weight = bmi * (height/100)**2
            bs, bh = (0.259, 0.195) if sex=="M" else (0.231, 0.218)
            sh  = bs  + 0.0012*(bmi-22) + np.random.normal(0,0.009)
            hh  = bh  + 0.0018*(bmi-22) + np.random.normal(0,0.009)
            wh  = 0.160+0.0025*(bmi-18.5)+np.random.normal(0,0.008)
            th  = 0.310+np.random.normal(0,0.010)
            lh  = 0.530-0.0008*(bmi-22) +np.random.normal(0,0.012)
            nh  = 0.055+0.0008*(bmi-22) +np.random.normal(0,0.004)
            ah  = 0.058+0.0012*(bmi-22) +np.random.normal(0,0.005)
            tkh = 0.090+0.0018*(bmi-22) +np.random.normal(0,0.006)
            shr = sh/max(hh,0.001); whr=wh/max(hh,0.001); bri=wh*1.8
            rows.append(dict(height_cm=height,weight_kg=weight,bmi=bmi,
                shoulder_ratio=sh,hip_ratio=hh,waist_ratio=wh,torso_ratio=th,
                leg_ratio=lh,neck_ratio=nh,arm_ratio=ah,thigh_ratio=tkh,
                shoulder_hip_ratio=shr,waist_hip_ratio=whr,bri_proxy=bri))

        df = pd.DataFrame(rows)
        X  = df[POSE_FEAT].values
        X_tr,_,yb,_,yh,_,yw,_ = train_test_split(
            X, df["bmi"].values, df["height_cm"].values, df["weight_kg"].values,
            test_size=0.15, random_state=42)

        sc   = StandardScaler()
        Xts  = sc.fit_transform(X_tr)

        def gbr(): return GradientBoostingRegressor(
            n_estimators=400,learning_rate=0.05,max_depth=5,
            subsample=0.85,min_samples_leaf=10,random_state=42)
        def rfr(): return RandomForestRegressor(
            n_estimators=300,max_depth=10,min_samples_leaf=8,n_jobs=-1,random_state=42)

        print("[Pose] Training BMI ...")
        bg=gbr(); bg.fit(Xts,yb); br=rfr(); br.fit(Xts,yb)
        print("[Pose] Training Height ...")
        hg=gbr(); hg.fit(Xts,yh); hr=rfr(); hr.fit(Xts,yh)
        print("[Pose] Training Weight ...")
        wg=gbr(); wg.fit(Xts,yw); wr=rfr(); wr.fit(Xts,yw)

        pose_scaler=sc
        pose_bmi_gbr=bg; pose_bmi_rf=br
        pose_ht_gbr=hg;  pose_ht_rf=hr
        pose_wt_gbr=wg;  pose_wt_rf=wr
        pose_ready=True
        print("[Pose] Pose fallback ready.")

    except Exception as e:
        print(f"[Pose] Setup failed: {e}")
        print("[Pose] Pose fallback DISABLED.")


def _dist(a, b):
    return np.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2)

def _pt(lm, i, w, h):
    return np.array([lm[i].x * w, lm[i].y * h])


def extract_pose_features(img_bgr):
    import mediapipe as mp

    hh, ww = img_bgr.shape[:2]
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    # Use the cached detector — no per-request model loading
    result = pose_detector.detect(mp_image)

    if not result.pose_landmarks:
        return None, False

    lm   = result.pose_landmarks[0]
    ls   = _pt(lm,11,ww,hh); rs  = _pt(lm,12,ww,hh)
    lhp  = _pt(lm,23,ww,hh); rhp = _pt(lm,24,ww,hh)
    lk   = _pt(lm,25,ww,hh); rk  = _pt(lm,26,ww,hh)
    la   = _pt(lm,27,ww,hh); ra  = _pt(lm,28,ww,hh)
    le   = _pt(lm,13,ww,hh); re  = _pt(lm,14,ww,hh)
    ns   = _pt(lm, 0,ww,hh)
    lear = _pt(lm, 7,ww,hh); rear= _pt(lm, 8,ww,hh)

    head_top = ns[1] - _dist(lear,rear)*0.6
    foot_bot = max(la[1], ra[1])
    bh2      = max(foot_bot - head_top, 1.0)
    def r(d): return float(d/bh2)

    sh  = r(_dist(ls,rs))
    hhr = r(_dist(lhp,rhp))
    wh  = r(_dist((ls+lhp)/2,(rs+rhp)/2)*1.1)
    th  = r(_dist((ls+rs)/2,(lhp+rhp)/2))
    lh2 = r(_dist((lhp+rhp)/2,(la+ra)/2))
    nh  = r(_dist(lear,rear)*0.85)
    ah  = r((_dist(ls,le)+_dist(rs,re))/2)
    tkh = r((_dist(lhp,lk)+_dist(rhp,rk))/2)
    shr = sh/max(hhr,0.001); whr=wh/max(hhr,0.001); bri=wh*1.8
    feats = np.array([sh,hhr,wh,th,lh2,nh,ah,tkh,shr,whr,bri])

    vis_ok = all(lm[i].presence > 0.45 for i in [11,12,23,24,27,28])
    return feats, vis_ok


def predict_bmi_pose(img_bgr, known_height_cm=None):
    feats, vis_ok = extract_pose_features(img_bgr)
    if feats is None:
        return None

    Xs = pose_scaler.transform(feats.reshape(1,-1))
    def ens(g, r, X, w=0.6): return w*g.predict(X)+(1-w)*r.predict(X)

    bhat = float(ens(pose_bmi_gbr,pose_bmi_rf,Xs))
    hhat = float(ens(pose_ht_gbr, pose_ht_rf, Xs))
    what = float(ens(pose_wt_gbr, pose_wt_rf, Xs))

    rng   = np.random.default_rng(0)
    samps = [float(ens(pose_bmi_gbr,pose_bmi_rf,
             pose_scaler.transform((feats+rng.normal(0,0.012,feats.shape)).reshape(1,-1))))
             for _ in range(120)]
    lo = float(np.percentile(samps, 5))
    hi = float(np.percentile(samps, 95))

    # Preserve the uncertainty width so we can recentre after height rescaling
    bmi_ci_half = (hi - lo) / 2.0

    if known_height_cm and known_height_cm > 0:
        s    = known_height_cm / max(hhat, 1)
        hhat = float(known_height_cm)
        what = round(what * (s ** 2), 1)
        bhat = round(what / (known_height_cm / 100) ** 2, 1)
        # Recentre the CI on the rescaled BMI estimate, keeping the original uncertainty width
        lo = max(bhat - bmi_ci_half, 10.0)
        hi = min(bhat + bmi_ci_half, 60.0)

    label, col = bmi_cat(bhat)
    return {
        "bmi":            round(bhat, 1),
        "bmi_lo":         round(lo, 1),
        "bmi_hi":         round(hi, 1),
        "height_cm":      round(hhat, 1),
        "weight_kg":      round(what, 1),
        "category":       label,
        "cat_color":      col,
        "method":         "pose_estimation",
        "low_visibility": not vis_ok,
    }


# =============================================================================
# STARTUP
# =============================================================================
print("="*55)
print("  FitBot BMI API — Starting up")
print("="*55)
load_deep_learning_model()
setup_pose_models()
print("="*55)
print(f"  PRIMARY  DenseNet121 : {'ENABLED ✅' if dl_available else 'DISABLED ❌ (no .pt file)'}")
print(f"  FALLBACK Pose estim. : {'READY   ✅' if pose_ready   else 'FAILED  ❌'}")
print("="*55)


# =============================================================================
# ROUTES
# =============================================================================
@app.route("/predict-bmi", methods=["POST"])
def predict_bmi():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file         = request.files["image"]
    known_height = request.form.get("height", None)

    known_height_cm = None
    if known_height:
        try:
            val = float(known_height)
            if 50.0 <= val <= 280.0:
                known_height_cm = val
            else:
                return jsonify({"error": "Height must be between 50 and 280 cm."}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid height value provided."}), 400

    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Could not decode image"}), 400

    h0, w0 = img.shape[:2]
    if max(h0, w0) > 1024:
        s   = 1024 / max(h0, w0)
        img = cv2.resize(img, (int(w0*s), int(h0*s)))

    # Try deep learning first
    if dl_available:
        try:
            return jsonify(predict_bmi_deep_learning(img, known_height_cm)), 200
        except Exception as e:
            print(f"[DL] Inference error — falling back to pose: {e}")

    # Pose fallback
    if pose_ready:
        result = predict_bmi_pose(img, known_height_cm)
        if result is None:
            return jsonify({
                "error": "No person detected. Use a full-body, front-facing, well-lit photo."
            }), 422
        return jsonify(result), 200

    return jsonify({"error": "No prediction model available"}), 500


@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "deep_learning_enabled": dl_available,
        "pose_fallback_ready":   pose_ready,
        "model_file_present":    os.path.exists(MODEL_PT_PATH),
    }), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=False)
