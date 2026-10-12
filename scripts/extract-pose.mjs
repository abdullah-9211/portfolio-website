// Runs MediaPipe Pose over the Move test clips in a headless browser and
// writes the joint positions for every sampled frame to
// src/campaign/chapters/pose/<name>.json. The site draws its skeleton
// overlay from these files, so nothing heavy ships to visitors.
// Usage: start the dev server, then  node scripts/extract-pose.mjs http://localhost:3000
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const clips = ["move-a", "move-b"];
const FPS = 12;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.text().slice(0, 200)));
await page.goto(base, { waitUntil: "domcontentloaded" });

mkdirSync("src/campaign/chapters/pose", { recursive: true });

for (const name of clips) {
  const result = await page.evaluate(
    async ({ src, fps }) => {
      const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs");
      const files = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      const landmarker = await vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
      });
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.playsInline = true;
      await new Promise((res, rej) => {
        video.onloadeddata = res;
        video.onerror = () => rej(new Error("video failed to load"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      const frames = [];
      for (let t = 0; t < video.duration; t += 1 / fps) {
        video.currentTime = t;
        await new Promise((res) => (video.onseeked = res));
        ctx.drawImage(video, 0, 0);
        const out = landmarker.detect(canvas);
        const lm = out.landmarks[0];
        frames.push(lm ? lm.map((p) => [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000, Math.round((p.visibility ?? 0) * 100) / 100]) : null);
      }
      return { width: video.videoWidth, height: video.videoHeight, duration: video.duration, fps, frames };
    },
    { src: `/video/${name}.mp4`, fps: FPS },
  );
  writeFileSync(`src/campaign/chapters/pose/${name}.json`, JSON.stringify(result));
  console.log(name, result.width, result.height, result.duration.toFixed(2) + "s", result.frames.length, "frames,", result.frames.filter(Boolean).length, "with a pose");
}
await browser.close();
