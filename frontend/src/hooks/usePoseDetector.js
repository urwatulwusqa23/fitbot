// src/hooks/usePoseDetector.js
import { useEffect, useRef, useState, useCallback } from "react";

export function usePoseDetector() {
  const detectorRef = useRef(null);
  const [ready, setReady]   = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    const initModel = async () => {
      try {
        // Dynamically import to ensure proper loading order
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        const poseDetection = await import("@tensorflow-models/pose-detection");

        // Wait for TF to be ready
        await tf.ready();

        console.log("TF backend after ready:", tf.getBackend());

        // If WebGL failed fall back to CPU
        if (!tf.getBackend()) {
          await tf.setBackend("cpu");
          await tf.ready();
        }

        console.log("TF backend final:", tf.getBackend());

        // Load MoveNet model
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType:
              poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

        if (!cancelled) {
          detectorRef.current = detector;
          setReady(true);
          console.log("Pose model loaded successfully");
        }
      } catch (err) {
        console.error("Full TF init error:", err);
        if (!cancelled) {
          setError("Failed to load pose model: " + err.message);
        }
      }
    };

    initModel();

    return () => {
      cancelled = true;
    };
  }, []);

  const detectPose = useCallback(async (videoOrCanvas) => {
    if (!detectorRef.current) {
      console.warn("detectPose called but detector not ready");
      return null;
    }
    try {
      const poses = await detectorRef.current.estimatePoses(videoOrCanvas);
      return poses?.[0]?.keypoints ?? null;
    } catch (err) {
      console.error("detectPose error:", err);
      return null;
    }
  }, []);

  return { ready, error, detectPose };
}