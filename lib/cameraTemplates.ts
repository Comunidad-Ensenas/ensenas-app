/*
 * Index.tsx (manual configs) html template for hand tracking
 */
export const getConfigHtml = (facingMode: 'user' | 'environment') => {
  const scaleX = facingMode === 'user' ? '-1' : '1';

  return /*html*/`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { margin: 0; padding: 0; background-color: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
        video { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(${scaleX}); z-index: 1; }
        canvas { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(${scaleX}); z-index: 2; pointer-events: none; background-color: transparent; }
        #status { z-index: 100; position: absolute; top: 20px; text-align: center; width: 100%; background: rgba(0,0,0,0.7); padding: 10px 0; color: white; font-family: sans-serif; border-radius: 20px; font-size: 14px;}
      </style>
    </head>
    <body>
      <div id="status">Encendiendo cámara...</div>
      <video id="video" autoplay playsinline muted></video>
      <canvas id="canvas"></canvas>
      <script type="module">
        import { HandLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
        const video = document.getElementById("video");
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        const statusEl = document.getElementById("status");
        let handLandmarker;
        let drawingUtils;
        let lastVideoTime = -1;
        let lastPostTime = 0;
        let hadHandsLastFrame = false;

        async function init() {
          try {
            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              numHands: 1,
              minHandDetectionConfidence: 0.6,
              minHandPresenceConfidence: 0.6,
              minTrackingConfidence: 0.6
            });
            drawingUtils = new DrawingUtils(ctx);
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: "${facingMode}", width: { ideal: 640 }, height: { ideal: 480 } }, 
              audio: false 
            });
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            statusEl.style.display = "none";
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ error: err.message }));
          }
        }

        async function predictWebcam() {
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          let startTimeMs = performance.now();
          if (lastVideoTime !== video.currentTime) {
            lastVideoTime = video.currentTime;
            const results = handLandmarker.detectForVideo(video, startTimeMs);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (results.landmarks && results.landmarks.length > 0) {
              if (startTimeMs - lastPostTime > 150) {
                window.ReactNativeWebView.postMessage(JSON.stringify(results.landmarks));
                lastPostTime = startTimeMs;
              }
              hadHandsLastFrame = true;
              for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "rgba(255,255,255,0.7)", lineWidth: 4 });
                drawingUtils.drawLandmarks(landmarks, { color: "#38BDF8", lineWidth: 2, radius: 5 });
              }
            } else {
              if (hadHandsLastFrame) {
                 window.ReactNativeWebView.postMessage(JSON.stringify([]));
                 hadHandsLastFrame = false;
              }
            }
          }
          window.requestAnimationFrame(predictWebcam);
        }
        init();
      </script>
    </body>
    </html>
  `;
};

/**
 * Capture.tsx html template for capturing hands & body pose
 */
export const getCaptureHtml = (facingMode: 'user' | 'environment') => {
  const scaleX = facingMode === 'user' ? '-1' : '1';

  return /*html*/`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { margin: 0; padding: 0; background-color: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
        video { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(${scaleX}); z-index: 1; }
        canvas { position: absolute; width: 100%; height: 100%; object-fit: cover; transform: scaleX(${scaleX}); z-index: 2; pointer-events: none; background-color: transparent; }
      </style>
    </head>
    <body>
      <video id="video" autoplay playsinline muted></video>
      <canvas id="canvas"></canvas>
      <script type="module">
        import { PoseLandmarker, HandLandmarker, FilesetResolver, DrawingUtils } from "./vision_bundle.js";
        const video = document.getElementById("video");
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        let poseLandmarker;
        let handLandmarker;
        let drawingUtils;
        let lastVideoTime = -1;
        let lastPostTime = 0;

        function roundPoint(pt) {
          if (!pt) return pt;
          return {
            x: Math.round(pt.x * 10000) / 10000,
            y: Math.round(pt.y * 10000) / 10000,
            z: Math.round(pt.z * 10000) / 10000,
            visibility: pt.visibility !== undefined ? pt.visibility : 1
          };
        }

        async function init() {
          try {
            const vision = await FilesetResolver.forVisionTasks("./");
            poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: "./pose.task", delegate: "GPU" },
              runningMode: "VIDEO", minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5
            });
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: "./hand.task", delegate: "GPU" },
              runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
            });
            drawingUtils = new DrawingUtils(ctx);
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: "${facingMode}", width: { ideal: 640 }, height: { ideal: 480 } }, 
              audio: false 
            });
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            window.ReactNativeWebView.postMessage(JSON.stringify({ status: "READY" }));
          } catch (err) {}
        }

        async function predictWebcam() {
          try {
            if (canvas.width !== video.videoWidth) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            const startTimeMs = performance.now();
            if (lastVideoTime !== video.currentTime) {
              lastVideoTime = video.currentTime;
              const poseResults = poseLandmarker.detectForVideo(video, startTimeMs);
              const handResults = handLandmarker.detectForVideo(video, startTimeMs);
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
                drawingUtils.drawConnectors(poseResults.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, { color: "rgba(255,255,255,0.3)", lineWidth: 2 });
              }
              if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
                for (const landmarks of handResults.landmarks) {
                  drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#38BDF8", lineWidth: 2 });
                }
              }

              if (startTimeMs - lastPostTime > 66) {
                const frameData = { timestamp: Date.now(), pose3D: null, pose2D: null, leftHand: null, rightHand: null };

                if (poseResults && poseResults.worldLandmarks && poseResults.worldLandmarks.length > 0 && poseResults.landmarks.length > 0) {
                  frameData.pose3D = poseResults.worldLandmarks[0].map(roundPoint);
                  frameData.pose2D = poseResults.landmarks[0].map(roundPoint);
                }

                if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
                  handResults.landmarks.forEach((hand, index) => {
                    const classification = handResults.handednesses[index][0].category;
                    if (classification === "Left") {
                      frameData.leftHand = hand.map(roundPoint);
                    } else {
                      frameData.rightHand = hand.map(roundPoint);
                    }
                  });
                }

                if (frameData.pose3D || frameData.leftHand || frameData.rightHand) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(frameData));
                }
                lastPostTime = startTimeMs;
              }
            }
            window.requestAnimationFrame(predictWebcam);
          } catch (err) {}
        }
        init();
      </script>
    </body>
    </html>
  `;
};