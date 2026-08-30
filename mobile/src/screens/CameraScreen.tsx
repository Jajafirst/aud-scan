import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing, Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { X } from "lucide-react-native";
import { Theme } from "../Theme";
import { useHistory } from "../contexts/HistoryContext";
import { useAccessibility } from "../contexts/AccessibilityContext";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import * as tf from "@tensorflow/tfjs";
import { decodeJpeg } from "@tensorflow/tfjs-react-native";

const MODEL_URL       = "https://teachablemachine.withgoogle.com/models/Z11VY1264/";
const DENOM_THRESHOLD = 0.35;
const PASS_THRESHOLD  = 0.80;
// Capture takes roughly 3s per frame, far slower than the tilt instructions
// used to cycle. Phases therefore run to a FRAME COUNT, not a clock: each
// prompt stays up until a frame is actually taken for it, so every direction
// the user is asked for contributes a sample. PHASE_TIMEOUT only rescues a
// phase where capture has stalled.
const TARGET_FRAMES   = 4;     // one per tilt direction
const PHASE_TIMEOUT   = 25000; // ms — safety net, not the normal exit
const FRAME_INTERVAL  = 400;   // fires often; a busy guard drops overlapping calls

// Feature thresholds, from two scans of genuine $10 AK173948183 and one of
// counterfeit AK173948185.
//
//                     genuine A  genuine B    fake    verdict
//   bird variance       0.1018     0.1084     0.0542  separates
//   edge sharpness      0.0357     0.0207     0.0095  separates, narrowly
//   fine detail         0.0432     0.0202     0.0197  DOES NOT separate
//   window variance     0.0514     0.0264     0.0369  DOES NOT separate
//
// The two genuine scans differ from each other by more than genuine differs
// from counterfeit on detail and window variance — genuine B landed at 0.0202
// against the fake's 0.0197, and its window variance fell BELOW the fake's.
// Both track camera focus and working distance rather than the note, so they
// no longer decide anything on their own: they contribute only a small amount
// of weight, and the verdict rests on the measures that held up across repeat
// scans of the same note.
//
// Chroma is read separately per side. The front numeral measured 0.0946 and
// the back only 0.0272 on the genuine note, so a single shared threshold (the
// earlier 0.09, which was a guess) failed the back of a real note every time.
const TH_BIRD_VARIANCE   = 0.070;  // between fake 0.0542 and genuine 0.10+
const TH_SHARPNESS_MIN   = 0.013;  // below genuine B 0.0207, above fake 0.0095
const TH_DETAIL_MIN      = 0.012;  // genuine B 0.0202 vs fake 0.0197 — weak
const TH_WINDOW_VAR      = 0.015;  // set low: this measure does not separate
const TH_OVI_CHROMA_FRONT= 0.060;  // genuine 0.0946
const TH_OVI_CHROMA_BACK = 0.015;  // genuine 0.0272 — needs a fake reading

// Median is robust to the one bad frame (motion blur, glare) that a
// last-frame-wins or mean-based reading would let decide the whole check.
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function range(xs: number[]): number {
  return xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0;
}

const LABEL_TO_DENOM: Record<string, number> = {
  "new-5": 5, "new-10": 10, "new-20": 20, "new-50": 50, "new-100": 100,
};

const DENOM_HUE: Record<number, [number, number]> = {
  5:   [290, 360],
  10:  [190, 240],
  20:  [0,   35],
  50:  [35,  70],
  100: [90,  150],
};

// Note frame geometry — AUD notes are ~2.1:1, held portrait for scanning
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const FRAME_W = SCREEN_W * 0.62;
const FRAME_H = FRAME_W * 2.1;

// Where the on-screen frame sits, as fractions of the preview. Analysis crops
// to exactly this rectangle: measuring the whole frame measured the room —
// desk, hands and ambient light swamped the note and made real and fake alike.
const FRAME_CENTER_Y = (SCREEN_H - 120) / 2;   // frameWrap has paddingBottom: 120
const CROP = {
  x0: (SCREEN_W - FRAME_W) / 2 / SCREEN_W,
  y0: (FRAME_CENTER_Y - FRAME_H / 2) / SCREEN_H,
  x1: (SCREEN_W + FRAME_W) / 2 / SCREEN_W,
  y1: (FRAME_CENTER_Y + FRAME_H / 2) / SCREEN_H,
};

// Sub-regions within the note, matching the on-screen zone guides
const ZONE_ROLLING = { x0: 0.06, y0: 0.81, x1: 0.48, y1: 0.95 }; // front, bottom-left "10"
const ZONE_REVERSE = { x0: 0.06, y0: 0.05, x1: 0.48, y1: 0.19 }; // back, top-left "10"
const ZONE_WINDOW  = { x0: 0.10, y0: 0.38, x1: 0.90, y1: 0.68 }; // clear polymer window
// Plain printed area with no optical features — the control for every
// differential measurement. Whatever happens here is lighting, not security ink.
const ZONE_REF     = { x0: 0.15, y0: 0.20, x1: 0.85, y1: 0.34 };

type Rect = { x0: number; y0: number; x1: number; y1: number };

// Crop a decoded image to a normalised rectangle
function cropRect(img: tf.Tensor3D, r: Rect): tf.Tensor3D {
  const [h, w] = img.shape;
  const top    = Math.max(0, Math.round(r.y0 * h));
  const left   = Math.max(0, Math.round(r.x0 * w));
  const height = Math.max(1, Math.min(h - top,  Math.round((r.y1 - r.y0) * h)));
  const width  = Math.max(1, Math.min(w - left, Math.round((r.x1 - r.x0) * w)));
  return img.slice([top, left, 0], [height, width, -1]);
}

// Crop the camera image down to the note frame, then optionally to a zone inside it
function cropToNote(img: tf.Tensor3D, zone?: Rect): tf.Tensor3D {
  const note = cropRect(img, CROP);
  return zone ? cropRect(note, zone) : note;
}

type ScanPhase = "loading" | "serial" | "bird" | "phase1" | "flip" | "phase2" | "done";
type CheckStatus = "pending" | "pass" | "fail";
interface CheckItem { label: string; status: CheckStatus }

const TILT_HINTS = [
  { arrow: "←", label: "TILT LEFT" },
  { arrow: "→", label: "TILT RIGHT" },
  { arrow: "↑", label: "TILT UP" },
  { arrow: "↓", label: "TILT DOWN" },
];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))]);
}

function getDominantHue(r: tf.Tensor, g: tf.Tensor, b: tf.Tensor): number {
  const rM = r.mean().dataSync()[0] / 255;
  const gM = g.mean().dataSync()[0] / 255;
  const bM = b.mean().dataSync()[0] / 255;
  const max = Math.max(rM, gM, bM);
  const min = Math.min(rM, gM, bM);
  const delta = max - min;
  if (delta < 0.01) return 0;
  let hue = 0;
  if (max === rM)      hue = 60 * (((gM - bM) / delta) % 6);
  else if (max === gM) hue = 60 * ((bM - rM) / delta + 2);
  else                 hue = 60 * ((rM - gM) / delta + 4);
  return hue < 0 ? hue + 360 : hue;
}

// Mean luminance of one zone of the note
function meanLuma(img: tf.Tensor3D, zone: Rect): number {
  const z  = tf.image.resizeBilinear(cropToNote(img, zone), [96, 96]).toFloat();
  const r  = z.slice([0, 0, 0], [-1, -1, 1]);
  const g  = z.slice([0, 0, 1], [-1, -1, 1]);
  const b  = z.slice([0, 0, 2], [-1, -1, 1]);
  return r.mul(0.299).add(g.mul(0.587)).add(b.mul(0.114)).div(255).mean().dataSync()[0];
}

// Dominant hue of one zone of the note
function zoneHue(img: tf.Tensor3D, zone: Rect): number {
  const z = tf.image.resizeBilinear(cropToNote(img, zone), [96, 96]).toFloat();
  return getDominantHue(
    z.slice([0, 0, 0], [-1, -1, 1]),
    z.slice([0, 0, 1], [-1, -1, 1]),
    z.slice([0, 0, 2], [-1, -1, 1]),
  );
}

// Luminance variance of one zone — how much visible structure it carries
function zoneVariance(img: tf.Tensor3D, zone: Rect): number {
  const z = tf.image.resizeBilinear(cropToNote(img, zone), [96, 96]).toFloat();
  const r = z.slice([0, 0, 0], [-1, -1, 1]);
  const g = z.slice([0, 0, 1], [-1, -1, 1]);
  const b = z.slice([0, 0, 2], [-1, -1, 1]);
  const y = r.mul(0.299).add(g.mul(0.587)).add(b.mul(0.114)).div(255);
  const m = y.mean();
  return y.sub(m).square().mean().dataSync()[0];
}

// Mean per-pixel chroma (colour strength) of one zone. Optically variable ink
// is strongly coloured at any viewing angle; the counterfeit's equivalent
// patches came back grey, which is what this measures.
function zoneChroma(img: tf.Tensor3D, zone: Rect): number {
  const z   = tf.image.resizeBilinear(cropToNote(img, zone), [96, 96]).toFloat().div(255);
  const r   = z.slice([0, 0, 0], [-1, -1, 1]);
  const g   = z.slice([0, 0, 1], [-1, -1, 1]);
  const b   = z.slice([0, 0, 2], [-1, -1, 1]);
  const max = r.maximum(g).maximum(b);
  const min = r.minimum(g).minimum(b);
  return max.sub(min).mean().dataSync()[0];
}

// Flying bird sits in the clear window — measure only there, under torch
function analyzeBirdFrame(raw: Uint8Array): { brightness: number } {
  return tf.tidy(() => {
    const img     = decodeJpeg(raw, 3);
    const zone    = cropToNote(img, ZONE_WINDOW);
    const resized = tf.image.resizeBilinear(zone, [128, 128]);
    const brightness = resized.toFloat().div(255).mean().dataSync()[0];
    console.log(`[Bird] brightness=${brightness.toFixed(4)}`);
    return { brightness };
  });
}

function analyzePhase1Frame(raw: Uint8Array, denomination: number | null) {
  return tf.tidy(() => {
    const img = decodeJpeg(raw, 3);

    // ── Colour tone: the whole note ──
    const noteImg = tf.image.resizeBilinear(cropToNote(img), [256, 256]).toFloat();
    const nr = noteImg.slice([0, 0, 0], [-1, -1, 1]);
    const ng = noteImg.slice([0, 0, 1], [-1, -1, 1]);
    const nb = noteImg.slice([0, 0, 2], [-1, -1, 1]);

    const rN = nr.mean().dataSync()[0] / 255;
    const gN = ng.mean().dataSync()[0] / 255;
    const bN = nb.mean().dataSync()[0] / 255;
    const maxC = Math.max(rN, gN, bN), minC = Math.min(rN, gN, bN);
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
    const noteHue = getDominantHue(nr, ng, nb);

    let colorTone = false;
    if (saturation > 0.10 && denomination && DENOM_HUE[denomination]) {
      const [hMin, hMax] = DENOM_HUE[denomination];
      colorTone = noteHue < hMin || noteHue > hMax;
    }

    // ── Clear window ──
    // Structure seen through the transparent strip. A printout has no window,
    // so that area is flat print: genuine 0.0514 variance vs fake 0.0369.
    const winVar   = zoneVariance(img, ZONE_WINDOW);
    const winLuma  = meanLuma(img, ZONE_WINDOW);

    // ── Rolling colour: is the OVI patch actually coloured? ──
    const oviChroma = zoneChroma(img, ZONE_ROLLING);
    const oviHue    = zoneHue(img, ZONE_ROLLING);

    console.log(`[P1] noteHue=${noteHue.toFixed(1)}° sat=${saturation.toFixed(2)} oviChroma=${oviChroma.toFixed(4)} oviHue=${oviHue.toFixed(1)}° winVar=${winVar.toFixed(4)} winLuma=${winLuma.toFixed(3)}`);
    return { colorTone, oviChroma, winVar };
  });
}

function analyzePhase2Frame(raw: Uint8Array) {
  return tf.tidy(() => {
    const img = decodeJpeg(raw, 3);

    // ── Substrate texture + intaglio edges: the printed note body ──
    const noteImg = tf.image.resizeBilinear(cropToNote(img), [256, 256]).toFloat();
    const r = noteImg.slice([0, 0, 0], [-1, -1, 1]);
    const g = noteImg.slice([0, 0, 1], [-1, -1, 1]);
    const b = noteImg.slice([0, 0, 2], [-1, -1, 1]);
    const gray      = r.mul(0.299).add(g.mul(0.587)).add(b.mul(0.114)).div(255);
    const grayInput = gray.expandDims(0) as tf.Tensor4D;

    const lapKernel = tf.tensor4d([0, 1, 0, 1, -4, 1, 0, 1, 0], [3, 3, 1, 1]);
    const edges     = tf.conv2d(grayInput, lapKernel, 1, "same");
    const sharpness = edges.square().mean().dataSync()[0];

    const blurred   = tf.avgPool(grayInput, 5, 1, "same").squeeze([0]);
    const noise     = gray.sub(blurred).abs();
    const noiseMean = noise.mean().dataSync()[0];

    // ── Dynamic movement: is the reversing numeral actually coloured? ──
    const oviChroma = zoneChroma(img, ZONE_REVERSE);
    const oviHue    = zoneHue(img, ZONE_REVERSE);

    console.log(`[P2] sharp=${sharpness.toFixed(5)} detail=${noiseMean.toFixed(5)} oviChroma=${oviChroma.toFixed(4)} oviHue=${oviHue.toFixed(1)}°`);
    return { sharpness, detail: noiseMean, oviChroma };
  });
}

function parseOcrText(blocks: any[]): { serial: string | null; denom: number | null } {
  const raw   = blocks.map((b: any) => b.text).join(" ");
  const clean = raw.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  let denom: number | null = null;
  if (clean.includes("HUNDRED"))     denom = 100;
  else if (clean.includes("FIFTY"))  denom = 50;
  else if (clean.includes("TWENTY")) denom = 20;
  else if (clean.includes("TEN"))    denom = 10;
  else if (clean.includes("FIVE"))   denom = 5;

  const m = clean.match(/\b([A-Z]{2})\s*(\d[\d\s]{6,8}\d)\b/);
  const serial = m ? (m[1] + " " + m[2].replace(/\s/g, "")) : null;
  console.log(`[OCR] serial=${serial} denom=${denom}`);
  return { serial, denom };
}

export function CameraScreen() {
  const navigation  = useNavigation<any>();
  const { addScan } = useHistory();
  const { triggerHaptic, isHighContrastEnabled } = useAccessibility();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const hc = isHighContrastEnabled;
  const accent = hc ? "#CCFF00" : Theme.colors.gold;

  const [phase,     setPhase]     = useState<ScanPhase>("loading");
  const [progress,  setProgress]  = useState(0);
  const [serial,    setSerial]    = useState<string>("");
  const [denom,     setDenom]     = useState<number | null>(null);
  const [ocrStatus, setOcrStatus] = useState<"scanning" | "found" | "notfound">("scanning");
  const [tiltHint,  setTiltHint]  = useState(0);
  const [torchOn,   setTorchOn]   = useState(false);
  const [checks, setChecks] = useState<CheckItem[]>([
    { label: "Serial Number",    status: "pending" },
    { label: "Flying Bird",      status: "pending" },
    { label: "Color Tone",       status: "pending" },
    { label: "Clear Window",     status: "pending" },
    { label: "Rolling Colour",   status: "pending" },
    { label: "Dynamic Movement", status: "pending" },
    { label: "3D Dynamic Image", status: "pending" },
    { label: "Bump Patterns",    status: "pending" },
  ]);

  const rockAnim       = useRef(new Animated.Value(0)).current;
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const modelRef       = useRef<tf.LayersModel | null>(null);
  const labelsRef      = useRef<string[]>([]);
  const modelReadyRef  = useRef(false);
  const cameraReadyRef = useRef(false);
  const ocrRunningRef  = useRef(false);

  // Every per-frame measurement is collected, then reduced once at the end of
  // the phase — a single blurred or glared frame must not decide a check.
  const p1 = useRef({
    denomination: null as number | null,
    mlScore: 0,
    serialNumber: "",
    colorTone: false,
    clearWindow: false,
    rollingColour: false,
    oviChromas: [] as number[],
    winVars: [] as number[],
    colorToneFlags: [] as boolean[],
  });
  const p2 = useRef({
    oviChromas: [] as number[],
    sharpnesses: [] as number[],
    details: [] as number[],
    bumpPattern: false,
    dynamicImage3d: false,
  });
  const birdBrightness = useRef<number[]>([]);
  const busyRef = useRef(false);

  const updateCheck = (label: string, status: "pass" | "fail") =>
    setChecks(prev => prev.map(c => c.label === label ? { ...c, status } : c));

  const stopInterval = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  // Demonstrates the rocking motion the bird step asks for. Holding four
  // separate tilt poses under torchlight proved awkward; the check only needs
  // the note to move relative to the light, which a slow rock provides.
  const startRock = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rockAnim, { toValue:  1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rockAnim, { toValue: -1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  };

  useEffect(() => {
    (async () => {
      try {
        await tf.ready();
        const meta = await (await fetch(`${MODEL_URL}metadata.json`)).json();
        labelsRef.current = meta.labels ?? [];
        modelRef.current  = await tf.loadLayersModel(`${MODEL_URL}model.json`);
        const dummy = tf.zeros([1, 224, 224, 3]);
        modelRef.current.predict(dummy);
        dummy.dispose();
        modelReadyRef.current = true;
        if (cameraReadyRef.current) startSerialPhase();
      } catch (e: any) { console.error("[ML] Load failed:", e?.message); }
    })();
    return () => stopInterval();
  }, []);

  const onCameraReady = () => {
    cameraReadyRef.current = true;
    if (modelReadyRef.current) startSerialPhase();
  };

  // ─── STEP 1: Serial ──────────────────────────────────────────────────────
  const startSerialPhase = () => {
    setPhase("serial");
    setOcrStatus("scanning");

    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current || ocrRunningRef.current) return;
      ocrRunningRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: false, quality: 0.85, skipProcessing: false,
        });
        if (!photo?.uri) return;

        const ocr = await withTimeout(TextRecognition.recognize(photo.uri), 3000);
        if (!ocr) { setOcrStatus("notfound"); return; }

        const { serial: sn, denom: d } = parseOcrText(ocr.blocks);
        if (sn) {
          p1.current.serialNumber = sn;
          setSerial(sn);
          setOcrStatus("found");
          updateCheck("Serial Number", "pass");
        } else {
          setOcrStatus("notfound");
        }
        if (d && !p1.current.denomination) { p1.current.denomination = d; setDenom(d); }
      } catch {} finally { ocrRunningRef.current = false; }
    }, 1500);
  };

  const runMlDenomination = (raw: Uint8Array) => {
    if (!modelRef.current) return;
    const scores: number[] = tf.tidy(() => {
      const img  = decodeJpeg(raw, 3);
      const norm = tf.image.resizeBilinear(img, [224, 224]).toFloat().div(255).expandDims(0);
      return Array.from((modelRef.current!.predict(norm) as tf.Tensor).dataSync());
    });
    const topIdx   = scores.indexOf(Math.max(...scores));
    const topScore = scores[topIdx];
    const topLabel = labelsRef.current[topIdx] ?? "";
    const mlDenom  = LABEL_TO_DENOM[topLabel] ?? null;
    console.log(`[ML] ${topLabel}=${topScore.toFixed(3)} denom=${mlDenom}`);

    // Denomination identification only — this model cannot detect fakes.
    if (mlDenom && topScore > p1.current.mlScore) {
      p1.current.mlScore = topScore;
    }
    if (topScore >= DENOM_THRESHOLD && mlDenom && !p1.current.denomination) {
      p1.current.denomination = mlDenom;
      setDenom(mlDenom);
    }
  };

  const confirmSerial = () => {
    stopInterval();
    if (!serial) updateCheck("Serial Number", "fail");
    startBirdPhase();
  };

  // ─── STEP 2: Flying Bird (torch on, rock the note) ───────────────────────
  const startBirdPhase = () => {
    setPhase("bird");
    setProgress(0);
    setTorchOn(true);
    startRock();

    busyRef.current = false;
    const startTime = Date.now();
    intervalRef.current = setInterval(async () => {
      const done = birdBrightness.current.length;
      setProgress(Math.min(done / TARGET_FRAMES, 1));

      if (done >= TARGET_FRAMES || Date.now() - startTime >= PHASE_TIMEOUT) {
        stopInterval();
        setTorchOn(false);
        finalizeBird();
        return;
      }

      // Capture is slower than the interval; skip ticks that would overlap
      if (!cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
        // This step only needs the mean brightness of the window zone, which
        // survives heavy compression, so capture cheaply and finish sooner.
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.2, skipProcessing: true, shutterSound: false,
        });
        if (!photo?.base64) return;
        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));
        const { brightness } = analyzeBirdFrame(raw);
        birdBrightness.current.push(brightness);
        runMlDenomination(raw);
      } catch {} finally { busyRef.current = false; }
    }, FRAME_INTERVAL);
  };

  const finalizeBird = () => {
    const vals = birdBrightness.current;
    const bVar = range(vals);
    // Genuine note: torch light catches the shadow/OVI bird image → brightness
    // varies as the note rocks (measured 0.1018 and 0.1084). A flat printed
    // image stays uniform under the torch (measured 0.0542).
    const flyingBird = vals.length >= 2 && bVar < TH_BIRD_VARIANCE;
    console.log(`[Bird Final] frames=${vals.length} var=${bVar.toFixed(4)} fail=${flyingBird}`);
    updateCheck("Flying Bird", flyingBird ? "fail" : "pass");
    startPhase1();
  };

  // ─── STEP 3: Phase 1 tilt (front) ────────────────────────────────────────
  const startPhase1 = () => {
    setPhase("phase1");
    setProgress(0);
    setTiltHint(0);
    busyRef.current = false;
    const startTime = Date.now();

    intervalRef.current = setInterval(async () => {
      const done = p1.current.oviChromas.length;
      setProgress(Math.min(done / TARGET_FRAMES, 1));

      if (done >= TARGET_FRAMES || Date.now() - startTime >= PHASE_TIMEOUT) {
        stopInterval();
        finalizePhase1();
        setPhase("flip");
        return;
      }

      if (!cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
        // Chroma and region variance tolerate compression; only the sharpness
        // measure in phase 2 needs full detail.
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.4, skipProcessing: true, shutterSound: false,
        });
        if (!photo?.base64) return;
        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));
        runMlDenomination(raw);
        const f = analyzePhase1Frame(raw, p1.current.denomination);
        p1.current.oviChromas.push(f.oviChroma);
        p1.current.winVars.push(f.winVar);
        p1.current.colorToneFlags.push(f.colorTone);
        setTiltHint(h => (h + 1) % TILT_HINTS.length);
      } catch {} finally { busyRef.current = false; }
    }, FRAME_INTERVAL);
  };

  const finalizePhase1 = () => {
    const { oviChromas, winVars, colorToneFlags } = p1.current;

    // Colour tone fails only if most frames agreed it was wrong
    const badTone   = colorToneFlags.filter(Boolean).length;
    const colorTone = colorToneFlags.length > 0 && badTone > colorToneFlags.length / 2;

    // Clear window — structure seen through the transparent strip
    const winVar      = median(winVars);
    const clearWindow = winVars.length > 0 && winVar < TH_WINDOW_VAR;

    // Rolling colour — the OVI patch must carry real colour, not read as grey
    const chroma        = median(oviChromas);
    const rollingColour = oviChromas.length > 0 && chroma < TH_OVI_CHROMA_FRONT;

    p1.current.colorTone     = colorTone;
    p1.current.clearWindow   = clearWindow;
    p1.current.rollingColour = rollingColour;

    console.log(`[P1 Final] frames=${oviChromas.length} chroma=${chroma.toFixed(4)} winVar=${winVar.toFixed(4)} → tone=${colorTone} window=${clearWindow} rolling=${rollingColour}`);
    updateCheck("Color Tone",     colorTone     ? "fail" : "pass");
    updateCheck("Clear Window",   clearWindow   ? "fail" : "pass");
    updateCheck("Rolling Colour", rollingColour ? "fail" : "pass");
  };

  // ─── STEP 4: Phase 2 tilt (back) ─────────────────────────────────────────
  const startPhase2 = () => {
    setPhase("phase2");
    setProgress(0);
    setTiltHint(0);
    busyRef.current = false;
    const startTime = Date.now();

    intervalRef.current = setInterval(async () => {
      const done = p2.current.sharpnesses.length;
      setProgress(Math.min(done / TARGET_FRAMES, 1));

      if (done >= TARGET_FRAMES || Date.now() - startTime >= PHASE_TIMEOUT) {
        stopInterval();
        await finalizePhase2();
        return;
      }

      if (!cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.7, skipProcessing: true, shutterSound: false,
        });
        if (!photo?.base64) return;
        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));
        const f = analyzePhase2Frame(raw);
        p2.current.oviChromas.push(f.oviChroma);
        p2.current.sharpnesses.push(f.sharpness);
        p2.current.details.push(f.detail);
        setTiltHint(h => (h + 1) % TILT_HINTS.length);
      } catch {} finally { busyRef.current = false; }
    }, FRAME_INTERVAL);
  };

  const finalizePhase2 = async () => {
    const { oviChromas, sharpnesses, details } = p2.current;

    // Dynamic movement — reversing numeral must be chromatic, not grey
    const chroma          = median(oviChromas);
    const dynamicMovement = oviChromas.length > 0 && chroma < TH_OVI_CHROMA_BACK;

    // Median so a single motion-blurred frame can't flip either check.
    // Both of these measure high-frequency content, and the genuine note has
    // MORE of it — printing loses microprint and intaglio texture rather than
    // adding grain, which is the opposite of what this code assumed before.
    const detail    = median(details);
    const sharpness = median(sharpnesses);
    const dynamicImage3d = details.length > 0     && detail    < TH_DETAIL_MIN;
    const bumpPattern    = sharpnesses.length > 0 && sharpness < TH_SHARPNESS_MIN;

    p2.current.bumpPattern    = bumpPattern;
    p2.current.dynamicImage3d = dynamicImage3d;

    console.log(`[P2 Final] frames=${sharpnesses.length} chroma=${chroma.toFixed(4)} detail=${detail.toFixed(4)} sharp=${sharpness.toFixed(4)}`);

    updateCheck("Dynamic Movement", dynamicMovement ? "fail" : "pass");
    updateCheck("3D Dynamic Image", dynamicImage3d  ? "fail" : "pass");
    updateCheck("Bump Patterns",    bumpPattern     ? "fail" : "pass");

    const { colorTone, clearWindow, rollingColour, serialNumber } = p1.current;
    const flyingBirdFail = checks.find(c => c.label === "Flying Bird")?.status === "fail";

    // Weighted by how each measure behaved across REPEAT scans of the same
    // note, not by how far apart a single pair sat. Bird variance was the only
    // one that stayed put across two genuine scans while remaining clear of the
    // fake, so it carries the most. Detail and window variance overlapped
    // between genuine scans and are kept at token weight — no combination of
    // them alone can now force a REVIEW.
    const score =
      (flyingBirdFail  ? 0.35 : 0) +  // stable across repeat scans
      (bumpPattern     ? 0.25 : 0) +  // separates, but narrowly
      (dynamicMovement ? 0.15 : 0) +
      (rollingColour   ? 0.15 : 0) +
      (colorTone       ? 0.10 : 0) +
      (dynamicImage3d  ? 0.05 : 0) +  // unreliable — token weight only
      (clearWindow     ? 0.05 : 0);   // unreliable — token weight only

    // The ML model is a DENOMINATION classifier trained only on genuine notes —
    // it scores a colour photocopy of a $10 as new-10 at 0.96, so it carries no
    // information about authenticity and must not feed the verdict. It is used
    // solely to identify which note we are looking at.
    const identified = !!p1.current.denomination;

    const pixelPass = score < 0.4;
    const verdict: "PASS" | "REVIEW" = (identified && pixelPass) ? "PASS" : "REVIEW";

    const mark = (fail: boolean) => fail ? "SUSPICIOUS" : "OK";
    console.log(
      `\n══════ SCAN RESULT ══════\n` +
      `  Note            : $${p1.current.denomination ?? "?"}  ${serialNumber || "(no serial)"}\n` +
      `  1 Serial Number : ${mark(!serialNumber)}\n` +
      `  2 Flying Bird   : ${mark(flyingBirdFail)}\n` +
      `  3 Color Tone    : ${mark(colorTone)}\n` +
      `  4 Clear Window  : ${mark(clearWindow)}\n` +
      `  5 Rolling Colour: ${mark(rollingColour)}\n` +
      `  6 Dynamic Move  : ${mark(dynamicMovement)}\n` +
      `  7 3D Image      : ${mark(dynamicImage3d)}\n` +
      `  8 Bump Patterns : ${mark(bumpPattern)}\n` +
      `  ─────────────────────\n` +
      `  Risk score      : ${score.toFixed(2)} / 1.00  (fail above 0.40)\n` +
      `  ML denom conf   : ${p1.current.mlScore.toFixed(3)}  (identification only)\n` +
      `  VERDICT         : ${verdict}\n` +
      `═════════════════════════\n` +
      `  raw: birdVar=${range(birdBrightness.current).toFixed(4)}(n=${birdBrightness.current.length}) ` +
      `p1Chroma=${median(p1.current.oviChromas).toFixed(4)}(n=${p1.current.oviChromas.length}) ` +
      `winVar=${median(p1.current.winVars).toFixed(4)} ` +
      `p2Chroma=${chroma.toFixed(4)} detail=${detail.toFixed(4)} sharp=${sharpness.toFixed(4)}\n`
    );
    triggerHaptic(verdict);

    await addScan({
      id: Date.now().toString(),
      denomination: p1.current.denomination ?? 0,
      verdict,
      timestamp: new Date().toISOString(),
      serialNumber: p1.current.serialNumber,
    });

    setPhase("done");
    navigation.navigate("Verdict", {
      status: verdict,
      serialNumber: p1.current.serialNumber,
      denomination: p1.current.denomination ?? undefined,
      confidence:   p1.current.mlScore,
      pixelChecks:  { colorTone, clearWindow, dynamicMovement, dynamicImage3d, rollingColour, bumpPattern },
    });
  };

  // ─── Shared pieces ───────────────────────────────────────────────────────
  const StepDots = ({ active }: { active: number }) => (
    <View style={styles.dots}>
      {[0, 1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.dot,
            i <  active && { backgroundColor: "#4ADE80" },
            i === active && { backgroundColor: accent, width: 20 },
          ]}
        />
      ))}
    </View>
  );

  const TopBar = ({ step, onClose }: { step: number; onClose: () => void }) => (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
        <X size={18} color="#fff" />
      </TouchableOpacity>
      <View style={styles.topCenter}>
        <Text style={styles.stepCount}>STEP {step + 1} OF 4</Text>
        <StepDots active={step} />
      </View>
      {denom ? (
        <View style={[styles.denomChip, { borderColor: accent }]}>
          <Text style={[styles.denomChipText, { color: accent }]}>${denom}</Text>
        </View>
      ) : (
        <View style={styles.denomChipEmpty} />
      )}
    </View>
  );

  const NoteFrame = ({ children }: { children?: React.ReactNode }) => (
    <View style={styles.frameWrap} pointerEvents="none">
      <View style={styles.frame}>
        <View style={[styles.fCorner, styles.fTL, { borderColor: accent }]} />
        <View style={[styles.fCorner, styles.fTR, { borderColor: accent }]} />
        <View style={[styles.fCorner, styles.fBL, { borderColor: accent }]} />
        <View style={[styles.fCorner, styles.fBR, { borderColor: accent }]} />
        {children}
      </View>
    </View>
  );

  const Zone = ({ style, label }: { style: any; label: string }) => (
    <View style={[styles.zone, style, { borderColor: accent }]}>
      <Text style={[styles.zoneLabel, { color: accent }]}>{label}</Text>
    </View>
  );

  const ProgressBar = () => (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: accent }]} />
    </View>
  );

  const CheckList = ({ items }: { items: CheckItem[] }) => (
    <View style={styles.checkList}>
      {items.map(c => {
        const color = c.status === "pass" ? "#4ADE80" : c.status === "fail" ? "#FB7185" : "rgba(255,255,255,0.25)";
        return (
          <View key={c.label} style={styles.checkRow}>
            <View style={[styles.checkDot, { borderColor: color, backgroundColor: c.status === "pass" ? color : "transparent" }]}>
              {c.status === "fail" && <Text style={styles.checkX}>✕</Text>}
            </View>
            <Text style={[styles.checkLabel, c.status === "pending" && { color: "rgba(255,255,255,0.4)" }]}>
              {c.label}
            </Text>
            {c.status === "pending"
              ? <ActivityIndicator size="small" color="rgba(255,255,255,0.25)" />
              : <Text style={[styles.checkBadge, { color }]}>{c.status === "pass" ? "PASS" : "FAIL"}</Text>}
          </View>
        );
      })}
    </View>
  );

  // ─── PERMISSION ──────────────────────────────────────────────────────────
  if (!permission) return <View style={styles.root} />;
  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { padding: 32 }]}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>AUDScan needs the camera to scan banknotes.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: accent }]} onPress={requestPermission}>
          <Text style={styles.btnText}>ALLOW CAMERA</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={styles.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── FLIP PROMPT ─────────────────────────────────────────────────────────
  if (phase === "flip") {
    return (
      <View style={styles.root}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={onCameraReady} />
        <View style={styles.sheetOverlay}>
          <View style={[styles.bigIcon, { borderColor: accent, backgroundColor: `${accent}22` }]}>
            <Text style={styles.bigIconText}>↻</Text>
          </View>
          <Text style={styles.bigTitle}>FLIP THE NOTE</Text>
          <Text style={styles.bigSub}>Turn it over to the back side{"\n"}(Banjo Paterson / Lyrebird)</Text>

          <View style={styles.timeline}>
            <Text style={styles.tlDone}>✓   Serial number read</Text>
            <Text style={styles.tlDone}>✓   Flying Bird checked</Text>
            <Text style={styles.tlDone}>✓   Front side scanned</Text>
            <Text style={[styles.tlNext, { color: accent }]}>→   Back side — last step</Text>
          </View>

          <TouchableOpacity style={[styles.btn, styles.btnWide, { backgroundColor: accent }]} onPress={startPhase2}>
            <Text style={styles.btnText}>I'VE FLIPPED IT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { stopInterval(); navigation.goBack(); }} style={{ marginTop: 14 }}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── STEP 2: BIRD ────────────────────────────────────────────────────────
  if (phase === "bird") {
    return (
      <View style={styles.root}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torchOn} onCameraReady={onCameraReady} />
        <View style={styles.scrim} pointerEvents="none" />

        <TopBar step={1} onClose={() => { stopInterval(); setTorchOn(false); navigation.goBack(); }} />

        <NoteFrame>
          <Animated.View style={[styles.birdBadge, {
            borderColor: accent, backgroundColor: `${accent}22`,
            transform: [{ rotate: rockAnim.interpolate({
              inputRange: [-1, 1], outputRange: ["-18deg", "18deg"],
            }) }],
          }]}>
            <Text style={styles.birdIcon}>🦅</Text>
          </Animated.View>
        </NoteFrame>

        {/* Rocking motion prompt */}
        <View style={styles.hintFloat} pointerEvents="none">
          <Text style={[styles.hintArrow, { color: accent }]}>↔</Text>
          <Text style={[styles.hintLabel, { color: accent }]}>ROCK SLOWLY</Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Flying Bird</Text>
              <Text style={styles.sheetSub}>Rock the note slowly left and right</Text>
            </View>
            <View style={[styles.torchChip, { borderColor: accent }]}>
              <Text style={[styles.torchText, { color: accent }]}>⚡ FLASH ON</Text>
            </View>
          </View>

          <ProgressBar />

          <View style={styles.rockTrack}>
            <Text style={[styles.rockEnd, { color: accent }]}>◀</Text>
            <Animated.View style={[styles.rockDot, {
              backgroundColor: accent,
              transform: [{ translateX: rockAnim.interpolate({
                inputRange: [-1, 1], outputRange: [-70, 70],
              }) }],
            }]} />
            <Text style={[styles.rockEnd, { color: accent }]}>▶</Text>
          </View>

          <Text style={styles.tip}>
            {Math.round(progress * TARGET_FRAMES)} of {TARGET_FRAMES} captured — keep rocking until the bar fills
          </Text>
        </View>
      </View>
    );
  }

  // ─── STEP 1: SERIAL ──────────────────────────────────────────────────────
  if (phase === "serial" || phase === "loading") {
    const found = ocrStatus === "found";
    return (
      <View style={styles.root}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={onCameraReady} />
        <View style={styles.scrim} pointerEvents="none" />

        <TopBar step={0} onClose={() => { stopInterval(); navigation.goBack(); }} />

        <NoteFrame>
          <Zone style={styles.zoneSerial} label="SERIAL NUMBER" />
        </NoteFrame>

        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Serial Number</Text>
              <Text style={styles.sheetSub}>
                {denom ? `$${denom} note detected` : "Hold the front of the note steady"}
              </Text>
            </View>
          </View>

          <View style={[styles.readout, found && { borderColor: "#4ADE80", backgroundColor: "rgba(74,222,128,0.08)" }]}>
            {phase === "loading" ? (
              <View style={styles.readoutRow}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={styles.readoutPending}>Loading scanner…</Text>
              </View>
            ) : found ? (
              <>
                <Text style={styles.readoutOk}>✓  DETECTED</Text>
                <Text style={styles.readoutValue}>{serial}</Text>
              </>
            ) : (
              <View style={styles.readoutRow}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={styles.readoutPending}>Looking for serial number…</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.btn, found ? { backgroundColor: accent } : styles.btnGhost]}
            onPress={confirmSerial}
          >
            <Text style={[styles.btnText, !found && styles.btnGhostText]}>
              {found ? "LOOKS GOOD — CONTINUE" : "SKIP & CONTINUE"}
            </Text>
          </TouchableOpacity>

          {ocrStatus === "notfound" && (
            <Text style={styles.tip}>Move closer and make sure the number is well lit</Text>
          )}
        </View>
      </View>
    );
  }

  // ─── STEP 3 / 4: TILT SCANS ──────────────────────────────────────────────
  const isPhase2 = phase === "phase2";
  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={onCameraReady} />
      <View style={styles.scrim} pointerEvents="none" />

      <TopBar step={isPhase2 ? 3 : 2} onClose={() => { stopInterval(); navigation.goBack(); }} />

      <NoteFrame>
        <Zone
          style={isPhase2 ? styles.zoneTopLeft : styles.zoneBottomLeft}
          label={isPhase2 ? "NUMBER\nREVERSING" : "ROLLING\nCOLOUR"}
        />
      </NoteFrame>

      <View style={styles.hintFloat} pointerEvents="none">
        <Text style={[styles.hintArrow, { color: accent }]}>{TILT_HINTS[tiltHint].arrow}</Text>
        <Text style={[styles.hintLabel, { color: accent }]}>{TILT_HINTS[tiltHint].label}</Text>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>{isPhase2 ? "Back Side" : "Front Side"}</Text>
            <Text style={styles.sheetSub}>
              {isPhase2 ? "Tilt to reveal the optical features" : "Tilt to reveal the colour shift"}
            </Text>
          </View>
          {serial ? (
            <View style={styles.serialTag}>
              <Text style={styles.serialTagLabel}>SERIAL</Text>
              <Text style={styles.serialTagValue}>{serial}</Text>
            </View>
          ) : null}
        </View>

        <ProgressBar />
        <Text style={styles.tip}>
          {Math.round(progress * TARGET_FRAMES)} of {TARGET_FRAMES} captured — hold each tilt until it advances
        </Text>
        <CheckList items={isPhase2 ? checks.slice(5) : checks.slice(2, 5)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center" },
  scrim:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },

  // ── Top bar ──
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center",
    paddingTop: 58, paddingHorizontal: 16, paddingBottom: 16,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  topCenter: { flex: 1, alignItems: "center", gap: 7 },
  stepCount: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  dots: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.22)" },
  denomChip: {
    minWidth: 52, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1.5,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center",
  },
  denomChipText: { fontSize: 16, fontWeight: "900" },
  denomChipEmpty: { width: 52 },

  // ── Note frame ──
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingBottom: 120 },
  frame:     { width: FRAME_W, height: FRAME_H, alignItems: "center", justifyContent: "center" },
  fCorner:   { position: "absolute", width: 30, height: 30, borderWidth: 3, borderRadius: 2 },
  fTL: { top: 0,    left: 0,  borderRightWidth: 0, borderBottomWidth: 0 },
  fTR: { top: 0,    right: 0, borderLeftWidth: 0,  borderBottomWidth: 0 },
  fBL: { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0 },
  fBR: { bottom: 0, right: 0, borderLeftWidth: 0,  borderTopWidth: 0 },

  // ── Zone highlights inside the frame ──
  zone: {
    position: "absolute", borderWidth: 1.5, borderRadius: 6,
    borderStyle: "dashed", backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  zoneLabel:      { fontSize: 9, fontWeight: "900", letterSpacing: 1, textAlign: "center", lineHeight: 12 },
  zoneSerial:     { top: "3%",    left: "6%",  right: "6%",  height: "8%" },
  zoneTopLeft:    { top: "5%",    left: "6%",  width: "42%", height: "14%" },
  zoneBottomLeft: { bottom: "5%", left: "6%",  width: "42%", height: "14%" },

  // ── Floating tilt hint ──
  hintFloat: {
    position: "absolute", top: "17%", alignSelf: "center",
    alignItems: "center", zIndex: 5,
  },
  hintArrow: { fontSize: 34, fontWeight: "900", lineHeight: 38 },
  hintLabel: { fontSize: 12, fontWeight: "900", letterSpacing: 2.5, marginTop: 2 },

  // ── Bird badge ──
  birdBadge: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  birdIcon: { fontSize: 38 },

  // ── Bottom sheet ──
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(10,13,18,0.96)",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 40,
    gap: 16,
  },
  sheetHead:  { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sheetTitle: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  sheetSub:   { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 3, lineHeight: 18 },

  serialTag:      { alignItems: "flex-end" },
  serialTagLabel: { color: "rgba(255,255,255,0.4)", fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  serialTagValue: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "monospace", marginTop: 2 },

  progressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" },
  progressFill:  { height: 3, borderRadius: 2 },

  // ── Checks ──
  checkList: { gap: 12 },
  checkRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  checkDot: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  checkX:     { color: "#fff", fontSize: 9, fontWeight: "900" },
  checkLabel: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "500" },
  checkBadge: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },

  // ── Serial readout ──
  readout: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  readoutRow:     { flexDirection: "row", alignItems: "center", gap: 10 },
  readoutPending: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  readoutOk:      { color: "#4ADE80", fontSize: 9, fontWeight: "900", letterSpacing: 2, marginBottom: 7 },
  readoutValue:   { color: "#fff", fontSize: 24, fontWeight: "700", fontFamily: "monospace", letterSpacing: 2 },

  // ── Rocking motion indicator ──
  rockTrack: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    alignSelf: "center", gap: 14, height: 40,
  },
  rockEnd: { fontSize: 15, opacity: 0.5 },
  rockDot: { width: 12, height: 12, borderRadius: 6 },

  torchChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, borderWidth: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  torchText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },

  tip: { color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", lineHeight: 17 },

  // ── Buttons ──
  btn:          { paddingVertical: 17, borderRadius: 14, alignItems: "center" },
  btnWide:      { width: "100%" },
  btnGhost:     { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  btnText:      { color: "#000", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  btnGhostText: { color: "rgba(255,255,255,0.6)" },
  linkText:     { color: "rgba(255,255,255,0.45)", fontSize: 14, textAlign: "center" },

  // ── Flip / full-screen prompt ──
  sheetOverlay: {
    flex: 1, backgroundColor: "rgba(10,13,18,0.94)",
    alignItems: "center", justifyContent: "center", padding: 32,
  },
  bigIcon: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginBottom: 22,
  },
  bigIconText: { fontSize: 38, color: "#fff" },
  bigTitle:    { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: 2, textAlign: "center" },
  bigSub:      { color: "rgba(255,255,255,0.55)", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 10 },
  timeline:    { width: "100%", gap: 9, marginTop: 30, marginBottom: 30 },
  tlDone:      { color: "#4ADE80", fontSize: 14 },
  tlNext:      { fontSize: 14, fontWeight: "700" },

  // ── Permission ──
  permTitle: { color: "#fff", fontSize: 21, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  permSub:   { color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 28 },
});