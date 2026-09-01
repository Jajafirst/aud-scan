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
import * as ImageManipulator from "expo-image-manipulator";
import * as tf from "@tensorflow/tfjs";
import { decodeJpeg } from "@tensorflow/tfjs-react-native";

const MODEL_URL       = "https://teachablemachine.withgoogle.com/models/Z11VY1264/";
const DENOM_THRESHOLD = 0.35;
const PASS_THRESHOLD  = 0.80;
// Bird/tilt phases used to run on a fixed timer that GUESSED when the user
// had finished moving — tuned once for a small motion, then a bigger target
// angle was asked for without the wait time following, and the screen said
// HOLD STILL before the user had physically finished tilting. A manual
// capture button fixed the timing but asked the user to notice a UI state
// and tap at the right moment, which is its own kind of friction.
//
// Capture is now fully automatic, driven by watching the camera feed itself:
// every poll compares this frame to the last one (frameMotion). The phase
// waits for real movement, then waits for it to stop, then captures — no
// clock involved, so it can't fire too early, and no button to notice either.
const MOTION_THUMB          = 16;   // thumbnail side, pixels — cheap on purpose
const MOTION_MOVE_THRESHOLD = 0.05; // above this, frame-to-frame, counts as "moving"
const MOTION_STILL_THRESHOLD = 0.02; // below this counts as "held still"
// Tried polling with a separate cheap throwaway photo, saving the full
// quality capture for the one accepted frame per direction. Reverted: on a
// real phone, camera shutter time is set by hardware (autofocus, exposure
// settling), not by the JPEG quality argument, so the "cheap" poll photo
// wasn't meaningfully faster to CAPTURE — only to encode — while doubling
// the number of shutter calls made every accepted frame slower, not faster.
// Back to one photo per tick, reused for both the motion check and analysis.
const POLL_INTERVAL_MS = 300;
const TARGET_FRAMES   = 4;     // one per tilt direction

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
// Absolute window brightness — retired as a verdict. Kept only so the raw line
// in the report stays comparable with earlier scans. It measured torch
// distance, not the note: the same counterfeit gave 0.0698 and 0.0957 on
// consecutive scans, landing either side of this threshold on hand movement.
const TH_BIRD_VARIANCE   = 0.070;  // between fake 0.0542 and genuine 0.10+
// The live bird check: how much the window/reference luminance RATIO swings
// across the rock. UNCALIBRATED — there is no genuine-$5 ratio measurement
// yet, so this number is a placeholder, not evidence. The bird's weight in the
// score is reduced accordingly until a matched pair fixes it.
const TH_BIRD_RATIO_SWING = 0.10;
// Reversing numeral: how much the dome's contrast-normalised pattern must
// change across the tilt before the feature counts as present. UNCALIBRATED —
// no matched-pair measurement exists yet, so this is a starting point to be
// replaced by the first genuine/fake reading.
const TH_NUMERAL_PATTERN_DIFF = 0.45;
// Colour SWING across the rock — how much the optically variable features
// change as the angle changes. Measured on a matched pair scanned back to back
// under the same lamp with the current two-position protocol:
//
//                 genuine $5   fake $5    ratio
//   front swing     0.0566     0.0060      9.4x
//   back swing      0.0150     0.0062      2.4x
//
// The front gap is wide and the direction was predicted from the physics
// before the data was taken: real optically variable ink shifts with angle,
// a printed imitation of it cannot. The back gap is real but narrow, so the
// back carries less weight in the score than the front.
const TH_OVI_SWING_FRONT = 0.025;  // between fake 0.0060 and genuine 0.0566
const TH_OVI_SWING_BACK  = 0.010;
// Two patches of the same feature, aligned and contrast-normalised, are the
// same appearance below this distance and a different one above it. Both
// numbers are PROVISIONAL: the per-scan `dists=[...]` log exists so they can
// be set from where genuine and counterfeit distances actually fall.
const TH_PATCH_SAME = 0.60;
const TH_MIN_STATES = 2;  // between fake 0.0062 and genuine 0.0150
const TH_SHARPNESS_MIN   = 0.013;  // below genuine B 0.0207, above fake 0.0095
const TH_DETAIL_MIN      = 0.012;  // genuine B 0.0202 vs fake 0.0197 — weak
// Single-frame window variance is kept only for the log — it does not
// separate (genuine 0.0514/0.0264 vs fake 0.0369/0.0425, fully overlapping).
// The live check is now how much the window/body brightness RATIO swings over
// the tilt. Provisional until scans from both notes are recorded.
const TH_WINDOW_RATIO_SWING = 0.12;
// Optically variable ink is dark at most viewing angles and vivid at a few.
// Photographs of a genuine $5 under raking light show the perched bird running
// vivid orange-green through to near-black across five tilt angles, and a large
// multicoloured numeral appearing in the dome on only two of them. Taking the
// MEDIAN chroma therefore punished the genuine note for behaving correctly,
// while flat printed ink — steady at every angle — scored a healthier middle
// value. The checks now look at the PEAK chroma reached at any angle, and at
// how far chroma swings across the tilt. Flat ink can match neither.
const TH_OVI_CHROMA_PEAK  = 0.090;  // strongest colour the patch must reach
const TH_OVI_CHROMA_SWING = 0.035;  // spread between its dullest and brightest

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

// Expected dominant hue per denomination, in degrees. These came from the
// nominal ink colours rather than from measurement, and the one entry that can
// be checked does not hold: a genuine $10 read between 62 and 106 degrees
// across scans, nowhere near the 190-240 listed for it. The check only avoids
// firing constantly because of the saturation gate in analyzePhase1Frame.
//
// Camera white balance, ambient colour temperature and the polymer's own sheen
// all move these, so usable ranges have to be measured through the phone rather
// than taken from the ink specification. Until that happens colour tone carries
// the lowest weight of any check and should not be relied on.
const DENOM_HUE: Record<number, [number, number]> = {
  5:   [290, 360], // unmeasured
  10:  [190, 240], // unmeasured, and contradicted by scans reading 62-106
  20:  [0,   35],  // unmeasured
  50:  [35,  70],  // unmeasured
  100: [90,  150], // unmeasured
};

type Rect = { x0: number; y0: number; x1: number; y1: number };

// Note frame geometry. Australian notes share a 65mm height but lengthen with
// value, so the frame — and therefore every zone crop inside it — has to be
// sized per denomination. A fixed 2.1 ratio fits the $10 and is roughly 13%
// too short for a $100, which would drag every crop out of position.
const NOTE_RATIO: Record<number, number> = {
  5:   130 / 65,  // 2.00
  10:  137 / 65,  // 2.11
  20:  144 / 65,  // 2.22
  50:  151 / 65,  // 2.32
  100: 158 / 65,  // 2.43
};
const DEFAULT_RATIO = NOTE_RATIO[10];

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const FRAME_W = SCREEN_W * 0.62;
const frameHeightFor = (d: number | null) => FRAME_W * (d ? NOTE_RATIO[d] ?? DEFAULT_RATIO : DEFAULT_RATIO);

// Where the on-screen frame sits, as fractions of the preview. Analysis crops
// to exactly this rectangle: measuring the whole frame measured the room —
// desk, hands and ambient light swamped the note and made real and fake alike.
const FRAME_CENTER_Y = (SCREEN_H - 120) / 2;   // frameWrap has paddingBottom: 120
const cropFor = (d: number | null) => {
  const h = frameHeightFor(d);
  return {
    x0: (SCREEN_W - FRAME_W) / 2 / SCREEN_W,
    y0: (FRAME_CENTER_Y - h / 2) / SCREEN_H,
    x1: (SCREEN_W + FRAME_W) / 2 / SCREEN_W,
    y1: (FRAME_CENTER_Y + h / 2) / SCREEN_H,
  };
};

// Sub-regions within the note, as fractions of the note held portrait.
//
// The colour-shifting features — Federation star, flying bird, perched bird and
// the numeral in the dome — all sit INSIDE the clear window strip, which
// photographs of a genuine $5 under raking light make plain. The OVI zones
// previously pointed at the printed corner numerals instead, which are ordinary
// flat ink and shift no colour at all.
//
// Both OVI zones now cover the window band generously rather than trying to pin
// one feature. That is safe because the checks read PEAK chroma: dull
// surroundings included in the crop cannot pull a maximum down, and whichever
// feature happens to fire at a given angle is caught.
interface NoteZones { rolling: Rect; reverse: Rect; numeral: Rect; window: Rect; ref: Rect }

// The series shares a design language — window roughly central, optical
// features inside it — so this layout is the starting point for every note.
// Each denomination gets its own entry below so a single one can be corrected
// without disturbing the others.
const ZONES_SERIES: NoteZones = {
  // Front and back OVI bands — the window strip plus a little margin
  rolling: { x0: 0.05, y0: 0.36, x1: 0.95, y1: 0.70 },
  reverse: { x0: 0.05, y0: 0.36, x1: 0.95, y1: 0.70 },
  // The reversing numeral sits at one end of the window strip, in the dome on
  // a $5. Reading the whole band gave OCR a busy image and it returned nothing
  // at all — neither plain nor mirrored — so the check could only ever report
  // failure. This narrower crop is upscaled before recognition so the digit is
  // large enough to resolve.
  numeral: { x0: 0.08, y0: 0.52, x1: 0.55, y1: 0.70 },
  window:  { x0: 0.10, y0: 0.38, x1: 0.90, y1: 0.68 }, // clear polymer window
  // Plain printed area with no optical features — the control for every
  // differential measurement. What happens here is lighting, not security ink.
  ref:     { x0: 0.15, y0: 0.15, x1: 0.85, y1: 0.30 },
};

// Per-denomination zones. Each note carries a different bird and its features
// may sit at slightly different heights within the window, so these are kept
// separate even where the values currently match. To correct one, replace its
// spread with explicit rectangles — nothing else needs to change.
//
// A scan whose p1Peak comes back near zero means the band missed the window on
// that denomination and its entry needs real measurements.
const ZONES: Record<number, NoteZones> = {
  5:   { ...ZONES_SERIES }, // Eastern Spinebill    — unverified
  10:  { ...ZONES_SERIES }, // checked against a real note
  20:  { ...ZONES_SERIES }, // Laughing Kookaburra  — unverified
  50:  { ...ZONES_SERIES }, // Black Swan           — unverified
  100: { ...ZONES_SERIES }, // Masked Owl           — unverified
};
const zonesFor = (d: number | null) => (d && ZONES[d]) || ZONES_SERIES;

// Crop a decoded image to a normalised rectangle
function cropRect(img: tf.Tensor3D, r: Rect): tf.Tensor3D {
  const [h, w] = img.shape;
  const top    = Math.max(0, Math.round(r.y0 * h));
  const left   = Math.max(0, Math.round(r.x0 * w));
  const height = Math.max(1, Math.min(h - top,  Math.round((r.y1 - r.y0) * h)));
  const width  = Math.max(1, Math.min(w - left, Math.round((r.x1 - r.x0) * w)));
  return img.slice([top, left, 0], [height, width, -1]);
}

// Crop the camera image to the note frame for this denomination, then
// optionally to a zone inside it
function cropToNote(img: tf.Tensor3D, denom: number | null, zone?: Rect): tf.Tensor3D {
  const note = cropRect(img, cropFor(denom));
  return zone ? cropRect(note, zone) : note;
}

type ScanPhase = "setup" | "loading" | "serial" | "bird" | "phase1" | "flip" | "phase2" | "done";
type CheckStatus = "pending" | "pass" | "fail";
interface CheckItem { label: string; status: CheckStatus }

// Rocking left and right only. Up and down were dropped for two reasons: the
// user reported reaching those positions was the hard part of the scan, and
// the features being measured - optically variable ink and the reversing
// numeral - respond to light raking ACROSS the note, which is the horizontal
// axis. Four frames still get captured, two at each side, so nothing is lost
// from the sample count; the motion between them is just far quicker to make.
const TILT_HINTS = [
  { arrow: "←", label: "TILT LEFT" },
  { arrow: "→", label: "TILT RIGHT" },
];

// The angle the on-screen rocking icon demonstrates, and the number named in
// the copy. Not a measured requirement — no gyroscope reading backs it — but
// a concrete target beats "slowly" alone: three genuine scans in a row showed
// front colour swing falling from 0.0566 to 0.0243 to 0.0134 right after the
// setup screen told users to move slowly with no indication of how far. A
// slow, shallow tilt is exactly what would produce that decline.
const TILT_TARGET_DEG = 35;

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
function meanLuma(img: tf.Tensor3D, denom: number | null, zone: Rect): number {
  const z  = tf.image.resizeBilinear(cropToNote(img, denom, zone), [96, 96]).toFloat();
  const r  = z.slice([0, 0, 0], [-1, -1, 1]);
  const g  = z.slice([0, 0, 1], [-1, -1, 1]);
  const b  = z.slice([0, 0, 2], [-1, -1, 1]);
  return r.mul(0.299).add(g.mul(0.587)).add(b.mul(0.114)).div(255).mean().dataSync()[0];
}

// Dominant hue of one zone of the note
function zoneHue(img: tf.Tensor3D, denom: number | null, zone: Rect): number {
  const z = tf.image.resizeBilinear(cropToNote(img, denom, zone), [96, 96]).toFloat();
  return getDominantHue(
    z.slice([0, 0, 0], [-1, -1, 1]),
    z.slice([0, 0, 1], [-1, -1, 1]),
    z.slice([0, 0, 2], [-1, -1, 1]),
  );
}

// Luminance variance of one zone — how much visible structure it carries
function zoneVariance(img: tf.Tensor3D, denom: number | null, zone: Rect): number {
  const z = tf.image.resizeBilinear(cropToNote(img, denom, zone), [96, 96]).toFloat();
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
function zoneChroma(img: tf.Tensor3D, denom: number | null, zone: Rect): number {
  const z   = tf.image.resizeBilinear(cropToNote(img, denom, zone), [96, 96]).toFloat().div(255);
  const r   = z.slice([0, 0, 0], [-1, -1, 1]);
  const g   = z.slice([0, 0, 1], [-1, -1, 1]);
  const b   = z.slice([0, 0, 2], [-1, -1, 1]);
  const max = r.maximum(g).maximum(b);
  const min = r.minimum(g).minimum(b);
  return max.sub(min).mean().dataSync()[0];
}

// A cheap thumbnail of the NOTE FRAME ONLY, used to detect motion — is the
// note moving right now, or has it stopped? This replaces every earlier
// attempt at guessing that from a fixed timer (SETTLE_MS, the rocking
// animation, a tap button): none of them could tell whether the user had
// actually finished tilting, only how long it had been since a prompt
// appeared. Comparing two real frames can — but only if it looks at the
// note. The first version compared the WHOLE camera frame, so anything
// moving in the background (an RGB keyboard cycling colours, in one report)
// registered as motion forever and the phase could never reach "held
// still," no matter how steady the note was. Same lesson as the zone crops
// elsewhere in this file: measure the note, not the room.
function frameThumbnail(raw: Uint8Array, denom: number | null): Float32Array {
  return tf.tidy(() => {
    const img   = decodeJpeg(raw, 3);
    const note  = cropToNote(img, denom);
    const small = tf.image.resizeBilinear(note, [MOTION_THUMB, MOTION_THUMB]).toFloat();
    const gray  = small.slice([0, 0, 0], [-1, -1, 1]).mul(0.299)
      .add(small.slice([0, 0, 1], [-1, -1, 1]).mul(0.587))
      .add(small.slice([0, 0, 2], [-1, -1, 1]).mul(0.114)).div(255);
    return gray.dataSync() as Float32Array;
  });
}

// Mean per-pixel difference between two thumbnails, 0 (identical) to 1
// (completely different). No prior frame counts as maximum motion, so the
// very first poll of a phase never accidentally reads as "already still."
function frameMotion(prev: Float32Array | null, next: Float32Array): number {
  if (!prev || prev.length !== next.length) return 1;
  let sum = 0;
  for (let i = 0; i < next.length; i++) sum += Math.abs(prev[i] - next[i]);
  return sum / next.length;
}

// One zone reduced to a contrast-normalised patch. Normalising means the
// comparison is of PATTERN, not brightness: the same picture at two exposures
// must not count as two different appearances.
function normalizedPatch(img: tf.Tensor3D, denom: number | null, zone: Rect): number[] {
  const patch = tf.image.resizeBilinear(cropToNote(img, denom, zone), [PATCH_N, PATCH_N]).toFloat();
  const pg = patch.slice([0, 0, 0], [-1, -1, 1]).mul(0.299)
    .add(patch.slice([0, 0, 1], [-1, -1, 1]).mul(0.587))
    .add(patch.slice([0, 0, 2], [-1, -1, 1]).mul(0.114)).div(255);
  const m = pg.mean();
  const sd = pg.sub(m).square().mean().sqrt();
  return Array.from(pg.sub(m).div(sd.add(1e-4)).dataSync());
}

// Flying bird sits in the clear window — measure only there, under torch.
//
// Absolute brightness of the window was the original measure and it does not
// work: it tracks how near the torch is and what angle the hand is at, not the
// note. The same counterfeit gave 0.0698 on one scan and 0.0957 on the next,
// straddling the threshold, because the two runs were rocked differently.
//
// Three quantities are returned instead, all measured per frame:
//
//   brightness — the old absolute value, kept only so past logs stay readable
//   ratio      — window luminance divided by the plain-print reference zone.
//                Moving the phone changes both zones together, so the ratio
//                holds still under hand movement and only responds to light
//                genuinely behaving differently inside the window.
//   variance   — how much structure the window carries. The bird is an image
//                that appears and vanishes with angle, so on a genuine note
//                this should rise and fall; a flat print keeps whatever
//                structure it has at every angle.
function analyzeBirdFrame(raw: Uint8Array, denom: number | null): {
  brightness: number; ratio: number; variance: number; patch: number[];
} {
  return tf.tidy(() => {
    const img  = decodeJpeg(raw, 3);
    const z    = zonesFor(denom);
    const win  = meanLuma(img, denom, z.window);
    const ref  = meanLuma(img, denom, z.ref);
    const brightness = tf.image.resizeBilinear(cropToNote(img, denom, z.window), [128, 128])
      .toFloat().div(255).mean().dataSync()[0];
    const ratio    = ref > 0.01 ? win / ref : 0;
    const variance = zoneVariance(img, denom, z.window);
    const patch    = normalizedPatch(img, denom, z.window);
    console.log(`[Bird] brightness=${brightness.toFixed(4)} win/ref=${win.toFixed(3)}/${ref.toFixed(3)} ratio=${ratio.toFixed(4)} var=${variance.toFixed(4)}`);
    return { brightness, ratio, variance, patch };
  });
}

function analyzePhase1Frame(raw: Uint8Array, denomination: number | null) {
  return tf.tidy(() => {
    const img = decodeJpeg(raw, 3);
    const z   = zonesFor(denomination);

    // ── Colour tone: the whole note ──
    const noteImg = tf.image.resizeBilinear(cropToNote(img, denomination), [256, 256]).toFloat();
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
    // Transparency cannot be seen in a single frame: printed detail and a real
    // view-through both produce luminance variance, and the genuine note in
    // fact measured LOWER variance (0.0264) than the counterfeit (0.0425).
    // What separates them is behaviour over the tilt — a real window shows the
    // background, so its brightness moves independently of the note, while a
    // printed one is part of the note and tracks it exactly. Both readings are
    // returned so the ratio between them can be tracked across frames.
    const winVar   = zoneVariance(img, denomination, z.window);
    const winLuma  = meanLuma(img, denomination, z.window);
    const bodyLuma = meanLuma(img, denomination, z.ref);

    // ── Rolling colour: is the OVI patch actually coloured? ──
    const oviChroma = zoneChroma(img, denomination, z.rolling);
    const oviHue    = zoneHue(img, denomination, z.rolling);

    console.log(`[P1] noteHue=${noteHue.toFixed(1)}° sat=${saturation.toFixed(2)} oviChroma=${oviChroma.toFixed(4)} winVar=${winVar.toFixed(4)} win/body=${winLuma.toFixed(3)}/${bodyLuma.toFixed(3)} ratio=${(bodyLuma > 0 ? winLuma / bodyLuma : 0).toFixed(3)}`);
    return { colorTone, oviChroma, winVar, winLuma, bodyLuma };
  });
}

function analyzePhase2Frame(raw: Uint8Array, denom: number | null) {
  return tf.tidy(() => {
    const img = decodeJpeg(raw, 3);
    const z   = zonesFor(denom);

    // ── Substrate texture + intaglio edges: the printed note body ──
    const noteImg = tf.image.resizeBilinear(cropToNote(img, denom), [256, 256]).toFloat();
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
    const oviChroma = zoneChroma(img, denom, z.reverse);
    const oviHue    = zoneHue(img, denom, z.reverse);

    // ── Reversing numeral: the shape of the dome under this lighting ──
    // Photographs of a genuine $5 lit from the left show a "5"; lit from the
    // right the same dome shows a MIRRORED "5". The feature is a change of
    // shape with the direction light rakes across it.
    //
    // Contrast-normalised so the comparison is of PATTERN, not brightness: a
    // flat print lit from two sides gives the same picture at two exposures,
    // and without normalising, that exposure difference alone would look like
    // a change of shape.
    const numeralPatch = normalizedPatch(img, denom, z.numeral);

    console.log(`[P2] sharp=${sharpness.toFixed(5)} detail=${noiseMean.toFixed(5)} oviChroma=${oviChroma.toFixed(4)} oviHue=${oviHue.toFixed(1)}°`);
    return { sharpness, detail: noiseMean, oviChroma, numeralPatch };
  });
}

// Largest pattern difference between any two captures of the numeral dome.
// Each patch is already contrast-normalised, so this compares shape alone.
// A genuine note swaps between "5" and a mirrored "5" as the light direction
// changes, which is a large structural difference. A printed dome holds one
// picture at every angle, so every pair looks nearly identical.
// Comparing the patches where they sit does not work: the note is handheld,
// so the fixed-fraction crop lands on a slightly different part of it each
// frame, and the resulting difference is the crop moving rather than the dome
// changing. Measured on the counterfeit it returned 0.9345 — roughly what two
// unrelated images score — from a flat print that cannot change shape at all.
//
// So slide one patch over the other and keep the BEST match. Whatever
// difference survives the best possible alignment is a real change of pattern,
// not drift. SEARCH is in patch pixels: at 48x48 over a band a few centimetres
// wide, +/-6 covers roughly a centimetre of hand movement.
const PATCH_N      = 48;
const PATCH_SEARCH = 6;

function alignedDifference(a: number[], b: number[]): number {
  let best = Infinity;
  for (let dy = -PATCH_SEARCH; dy <= PATCH_SEARCH; dy++) {
    for (let dx = -PATCH_SEARCH; dx <= PATCH_SEARCH; dx++) {
      let sum = 0, n = 0;
      for (let y = 0; y < PATCH_N; y++) {
        const sy = y + dy;
        if (sy < 0 || sy >= PATCH_N) continue;
        for (let x = 0; x < PATCH_N; x++) {
          const sx = x + dx;
          if (sx < 0 || sx >= PATCH_N) continue;
          sum += Math.abs(a[y * PATCH_N + x] - b[sy * PATCH_N + sx]);
          n++;
        }
      }
      // Ignore offsets where the patches barely overlap — a sliver can match
      // by accident and would report a spuriously good alignment.
      if (n > PATCH_N * PATCH_N * 0.5) best = Math.min(best, sum / n);
    }
  }
  return best === Infinity ? 0 : best;
}

// How many DISTINCT appearances a feature took across the captured frames.
//
// This is the test the note itself suggests. Photographs of a genuine $5 show
// the numeral dome in three different states depending on how light rakes it:
// blank, reversed, and normal. A counterfeit prints one picture, so it has
// exactly one state at every angle no matter how bright or vivid it looks.
//
// Counting states is harder to fool than measuring magnitude. A stray
// reflection or a wobble can inflate how MUCH a patch changes, but it cannot
// manufacture a second stable appearance that recurs across frames.
//
// Greedy clustering: each frame joins the first state it closely matches,
// otherwise it opens a new one. Patches are aligned before comparison, so a
// handheld note drifting in frame does not split one state into several.
function countDistinctStates(patches: number[][], sameThreshold: number): number {
  const states: number[][] = [];
  for (const p of patches) {
    if (p.length !== PATCH_N * PATCH_N) continue;
    if (!states.some(s => alignedDifference(s, p) < sameThreshold)) states.push(p);
  }
  return states.length;
}

// Every pairwise aligned distance, for the log. Reading these is how the
// same/different boundary gets set from real notes instead of guessed.
function patchDistances(patches: number[][]): number[] {
  const out: number[] = [];
  for (let i = 0; i < patches.length; i++)
    for (let j = i + 1; j < patches.length; j++)
      out.push(alignedDifference(patches[i], patches[j]));
  return out;
}

function maxPatchDifference(patches: number[][]): number {
  let worst = 0;
  for (let i = 0; i < patches.length; i++) {
    for (let j = i + 1; j < patches.length; j++) {
      const a = patches[i], b = patches[j];
      if (a.length !== PATCH_N * PATCH_N || b.length !== a.length) continue;
      worst = Math.max(worst, alignedDifference(a, b));
    }
  }
  return worst;
}

// The reversing numeral reads BACKWARDS on a genuine note — photographs of a
// $5 show a large mirrored "5" in the dome. Optical character recognition will
// not read a mirrored digit, so the test is asymmetric and needs no threshold:
// crop the window band, read it as-is, then read it flipped horizontally.
//
//   genuine  — plain reading fails, mirrored reading returns the denomination
//   printed  — whatever was printed reads the same either way, or not at all
//
// This is the only check here that yields a discrete answer rather than a
// statistic, so it is unaffected by focus, working distance and ambient light.
async function readReversedNumeral(
  uri: string, width: number, height: number, denom: number | null,
): Promise<{ plain: string; mirrored: string; reversedOk: boolean }> {
  const empty = { plain: "", mirrored: "", reversedOk: false };
  if (!denom) return empty;

  try {
    const crop = cropFor(denom);
    const noteX = crop.x0 * width;
    const noteY = crop.y0 * height;
    const noteW = (crop.x1 - crop.x0) * width;
    const noteH = (crop.y1 - crop.y0) * height;

    const toRegion = (band: Rect) => ({
      originX: Math.max(0, Math.round(noteX + band.x0 * noteW)),
      originY: Math.max(0, Math.round(noteY + band.y0 * noteH)),
      width:   Math.max(1, Math.round((band.x1 - band.x0) * noteW)),
      height:  Math.max(1, Math.round((band.y1 - band.y0) * noteH)),
    });

    const readDigits = async (band: Rect, flip: boolean) => {
      // Upscale hard. ML Kit needs a digit tens of pixels tall; this band is a
      // small slice of an already-cropped frame, and at the previous 800px the
      // numeral was still too small to resolve — every read came back empty.
      const ops: any[] = [{ crop: toRegion(band) }, { resize: { width: 1400 } }];
      if (flip) ops.push({ flip: ImageManipulator.FlipType.Horizontal });
      const out = await ImageManipulator.manipulateAsync(uri, ops, {
        format: ImageManipulator.SaveFormat.JPEG, compress: 1.0,
      });
      const ocr = await withTimeout(TextRecognition.recognize(out.uri), 3000);
      if (!ocr) return "";
      return (ocr as any).blocks.map((b: any) => b.text).join(" ").replace(/\s+/g, " ").trim();
    };

    // One guessed rectangle was the whole problem: when the guess missed, OCR
    // returned nothing and the log said only that the check had failed, which
    // taught us nothing about WHERE the numeral actually is. Sweep a few
    // plausible bands along the window strip instead, log every attempt, and
    // take the first that reads. The log then names the band that worked, so
    // the zone can be fixed properly rather than guessed at again.
    const zn = zonesFor(denom);
    const candidates: { name: string; band: Rect }[] = [
      { name: "numeral", band: zn.numeral },
      { name: "win-top", band: { x0: 0.06, y0: 0.36, x1: 0.50, y1: 0.54 } },
      { name: "win-bot", band: { x0: 0.06, y0: 0.54, x1: 0.50, y1: 0.72 } },
      { name: "win-all", band: { x0: 0.04, y0: 0.34, x1: 0.56, y1: 0.74 } },
    ];

    const wanted = String(denom);
    let plain = "", mirrored = "", hitBand = "";

    for (const c of candidates) {
      const p = await readDigits(c.band, false);
      const m = await readDigits(c.band, true);
      console.log(`[Reverse] band=${c.name} plain="${p}" mirrored="${m}"`);
      if (p || m) { plain = p; mirrored = m; hitBand = c.name; break; }
    }

    const inPlain    = plain.includes(wanted);
    const inMirrored = mirrored.includes(wanted);
    // Only the mirrored reading should find the numeral
    const reversedOk = inMirrored && !inPlain;

    console.log(`[Reverse] want="${wanted}" band=${hitBand || "NONE READ"} plain="${plain}" mirrored="${mirrored}" → reversedOk=${reversedOk}`);
    return { plain, mirrored, reversedOk };
  } catch (e: any) {
    console.log("[Reverse] failed:", e?.message);
    return empty;
  }
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

  const [phase,     setPhase]     = useState<ScanPhase>("setup");
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
    winRatios: [] as number[],
    colorToneFlags: [] as boolean[],
  });
  const p2 = useRef({
    oviChromas: [] as number[],
    sharpnesses: [] as number[],
    details: [] as number[],
    numeralPatches: [] as number[][],
    // The frame whose OVI band was most vivid — the numeral is most likely to
    // be fully formed there, so the mirrored-numeral read is done on it.
    bestUri: "" as string,
    bestChroma: -1,
    bestW: 0,
    bestH: 0,
    reversedOk: false,
    reverseSawText: false,
    bumpPattern: false,
    dynamicImage3d: false,
  });
  const autoAdvancedRef = useRef(false);
  // Mirrors `phase` so the deferred auto-advance can check the user has not
  // already moved on (or cancelled) before it fires.
  const phaseRef = useRef<ScanPhase>("loading");
  const birdBrightness = useRef<number[]>([]);
  const birdRatio      = useRef<number[]>([]);
  const birdVariance   = useRef<number[]>([]);
  const birdPatches    = useRef<number[][]>([]);
  const busyRef = useRef(false);
  // Motion state shared across the bird/front/back phases. prevThumb is last
  // poll's frame, for comparison; sawMove must go true (real movement seen)
  // before a still reading is allowed to trigger a capture — otherwise a
  // frame that simply never moved (e.g. right at the start of a phase) would
  // register as "already held" and capture immediately.
  const motionPrevThumb = useRef<Float32Array | null>(null);
  const motionSawMove   = useRef(false);
  // Safety net: if motion never reads as settled — an unusually shaky grip,
  // or a background the note-only crop still doesn't fully exclude — this
  // caps how many polls one direction can wait before accepting whatever the
  // current frame is anyway. Without it a stall here would hang the scan
  // completely rather than just costing one lower-quality frame.
  const motionStallRef = useRef(0);
  const MOTION_STALL_LIMIT = 27; // ~27 * 300ms ≈ 8s per direction
  const resetMotion = () => {
    motionPrevThumb.current = null;
    motionSawMove.current = false;
    motionStallRef.current = 0;
  };
  // Drives the on-screen status word. "move" = waiting for real movement,
  // "hold" = movement seen, now waiting for it to stop, "captured" = a frame
  // was just accepted (brief flash before the next direction).
  const [motionStatus, setMotionStatus] = useState<"move" | "hold" | "captured">("move");


  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const updateCheck = (label: string, status: "pass" | "fail") =>
    setChecks(prev => prev.map(c => c.label === label ? { ...c, status } : c));

  const stopInterval = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  // True while the user is still moving into the position just asked for.
  // Capture waits this out so frames are taken with the note held, not mid-swing.
  // The scan does not start the moment the screen opens. Repeat scans of the
  // same genuine note produced swing values from 0.024 to 0.057 on one check
  // alone — a spread as wide as the real/fake gap it is meant to detect — and
  // the working theory is that grip, distance and tilt speed vary between
  // scans more than the note does. A short guided setup, held the same way
  // every time, is the only lever that can fix that; the pixel measurements
  // cannot correct for it after the fact.
  const setupDoneRef = useRef(false);

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
        if (cameraReadyRef.current && setupDoneRef.current) startSerialPhase();
      } catch (e: any) { console.error("[ML] Load failed:", e?.message); }
    })();
    return () => stopInterval();
  }, []);

  const onCameraReady = () => {
    cameraReadyRef.current = true;
    if (modelReadyRef.current && setupDoneRef.current) startSerialPhase();
  };

  const beginScan = () => {
    setupDoneRef.current = true;
    setPhase("loading");
    if (cameraReadyRef.current && modelReadyRef.current) startSerialPhase();
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
          // Advance on its own once the serial is read. The confirm button
          // asked the user to approve a number the app had already recognised,
          // which is a decision with only one sensible answer.
          if (!autoAdvancedRef.current) {
            autoAdvancedRef.current = true;
            setTimeout(() => { if (phaseRef.current === "serial") confirmSerial(); }, 900);
          }
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

    // Always track the best banknote-detection confidence, even when OCR
    // already supplied the denomination — this feeds the final verdict.
    if (mlDenom && topScore > p1.current.mlScore) {
      p1.current.mlScore = topScore;
    }
    // Only ML sets the denomination when OCR hasn't found one
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

  // ─── STEP 2: Flying Bird (torch on, tilt all directions) ─────────────────
  // Capture is user-triggered: tilt to the shown direction, tap the button
  // when you're there. No timer decides this for you.
  const startBirdPhase = () => {
    setPhase("bird");
    setProgress(0);
    setTiltHint(0);
    setMotionStatus("move");
    resetMotion();
    // Clear last scan's samples — these refs outlive a single scan, so without
    // this a second scan without remounting would average in the first note.
    birdBrightness.current = [];
    birdRatio.current      = [];
    birdVariance.current   = [];
    birdPatches.current    = [];
    setTorchOn(true);
    busyRef.current = false;

    // Every poll uses the SAME photo for both the motion check and, once
    // stillness is confirmed, the real measurement — one capture per tick,
    // not two, so this costs nothing extra over the earlier timer version.
    intervalRef.current = setInterval(async () => {
      const done = birdPatches.current.length;
      if (done >= TARGET_FRAMES) {
        stopInterval();
        setTorchOn(false);
        finalizeBird();
        return;
      }
      if (!cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.2, skipProcessing: true, shutterSound: false,
        });
        if (!photo?.base64) return;
        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));

        const thumb = frameThumbnail(raw, p1.current.denomination);
        const motion  = frameMotion(motionPrevThumb.current, thumb);
        const stalled = motionStallRef.current >= MOTION_STALL_LIMIT;
        motionPrevThumb.current = thumb;
        motionStallRef.current += 1;

        if (!stalled && motion >= MOTION_MOVE_THRESHOLD) {
          motionSawMove.current = true;
          setMotionStatus("move");
          return;
        }
        if (!stalled && (motion >= MOTION_STILL_THRESHOLD || !motionSawMove.current)) {
          setMotionStatus(motionSawMove.current ? "hold" : "move");
          return;
        }

        // Held still after real movement — accept this frame.
        const b = analyzeBirdFrame(raw, p1.current.denomination);
        birdBrightness.current.push(b.brightness);
        birdRatio.current.push(b.ratio);
        birdVariance.current.push(b.variance);
        birdPatches.current.push(b.patch);
        runMlDenomination(raw);

        const next = birdPatches.current.length;
        setProgress(Math.min(next / TARGET_FRAMES, 1));
        setMotionStatus("captured");
        resetMotion(); // must see fresh movement before the next side counts
        setTiltHint(h => (h + 1) % TILT_HINTS.length);
      } catch {} finally { busyRef.current = false; }
    }, POLL_INTERVAL_MS);
  };

  const finalizeBird = () => {
    const vals       = birdBrightness.current;
    const bVar       = range(vals);              // absolute — kept for the log only
    const ratioSwing = range(birdRatio.current); // differential — the verdict
    const varSwing   = range(birdVariance.current);

    // The verdict rests on ratioSwing, not on absolute brightness. A genuine
    // window changes how it carries light as the note rocks, and dividing by
    // the plain-print reference removes the hand movement that made the old
    // absolute measure flip the same note either side of its threshold.
    //
    // TH_BIRD_RATIO_SWING is NOT yet calibrated against a genuine note — there
    // is no genuine-$5 ratio data at all. Until there is, the bird cannot be
    // allowed to carry a verdict on its own, so its weight is cut in the score
    // and both other measures are logged for comparison. Whichever of the
    // three actually separates a matched pair becomes the real check.
    // The bird, like the numeral, takes distinct appearances as the light rakes
    // across it rather than merely getting brighter. Counting those states is
    // immune to the confound that wrecked the ratio measure: on the matched
    // pair, ratioSwing read 0.6952 genuine against 0.2021 fake purely because
    // the genuine note was held less steadily — its reference zone swung from
    // 0.512 to 0.362 while the fake's barely moved. Hand movement cannot
    // manufacture a second stable appearance.
    const birdStates = countDistinctStates(birdPatches.current, TH_PATCH_SAME);
    const flyingBird = birdPatches.current.length >= 2 && birdStates < TH_MIN_STATES;
    console.log(
      `[Bird Final] frames=${vals.length} states=${birdStates} ` +
      `dists=[${patchDistances(birdPatches.current).map(d => d.toFixed(3)).join(" ")}] ` +
      `ratioSwing=${ratioSwing.toFixed(4)} varSwing=${varSwing.toFixed(4)} absVar=${bVar.toFixed(4)} fail=${flyingBird}`,
    );
    updateCheck("Flying Bird", flyingBird ? "fail" : "pass");
    startPhase1();
  };

  // ─── STEP 3: Phase 1 tilt (front) ────────────────────────────────────────
  const startPhase1 = () => {
    setPhase("phase1");
    setProgress(0);
    setTiltHint(0);
    setMotionStatus("move");
    resetMotion();
    busyRef.current = false;

    intervalRef.current = setInterval(async () => {
      const done = p1.current.oviChromas.length;
      if (done >= TARGET_FRAMES) {
        stopInterval();
        finalizePhase1();
        setPhase("flip");
        return;
      }
      if (!cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
        // One photo per tick, reused for both the motion check and the real
        // measurement. A two-photo version (cheap poll shot, then a second
        // full-quality shot only once still) was tried and made things
        // slower, not faster: on a real phone the camera shutter is limited
        // by hardware — autofocus and exposure settling — not by the JPEG
        // quality setting, so a "cheap" poll photo isn't meaningfully faster
        // to CAPTURE, only marginally faster to encode. Doubling the number
        // of shutter calls at the busiest moment made it worse.
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.4, skipProcessing: true, shutterSound: false,
        });
        if (!photo?.base64) return;
        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));

        const thumb = frameThumbnail(raw, p1.current.denomination);
        const motion  = frameMotion(motionPrevThumb.current, thumb);
        const stalled = motionStallRef.current >= MOTION_STALL_LIMIT;
        motionPrevThumb.current = thumb;
        motionStallRef.current += 1;

        if (!stalled && motion >= MOTION_MOVE_THRESHOLD) {
          motionSawMove.current = true;
          setMotionStatus("move");
          return;
        }
        if (!stalled && (motion >= MOTION_STILL_THRESHOLD || !motionSawMove.current)) {
          setMotionStatus(motionSawMove.current ? "hold" : "move");
          return;
        }

        runMlDenomination(raw);
        const f = analyzePhase1Frame(raw, p1.current.denomination);
        p1.current.oviChromas.push(f.oviChroma);
        p1.current.winVars.push(f.winVar);
        p1.current.winRatios.push(f.bodyLuma > 0 ? f.winLuma / f.bodyLuma : 0);
        p1.current.colorToneFlags.push(f.colorTone);

        const next = p1.current.oviChromas.length;
        setProgress(Math.min(next / TARGET_FRAMES, 1));
        setMotionStatus("captured");
        resetMotion();
        setTiltHint(h => (h + 1) % TILT_HINTS.length);
      } catch {} finally { busyRef.current = false; }
    }, POLL_INTERVAL_MS);
  };

  const finalizePhase1 = () => {
    const { oviChromas, winVars, winRatios, colorToneFlags } = p1.current;

    // Colour tone fails only if most frames agreed it was wrong
    const badTone   = colorToneFlags.filter(Boolean).length;
    const colorTone = colorToneFlags.length > 0 && badTone > colorToneFlags.length / 2;

    // Clear window — does the window brighten and darken independently of the
    // note body? A transparent panel shows the shifting background as the note
    // tilts, so the window/body ratio moves. A printed panel is part of the
    // note and holds a fixed ratio to it.
    const winVar      = median(winVars);
    const ratioSwing  = range(winRatios);
    const clearWindow = winRatios.length >= 3 && ratioSwing < TH_WINDOW_RATIO_SWING;

    // Rolling colour — the patch must either reach a strong colour at some
    // angle, or visibly swing between angles. Printed ink does neither.
    const chromaPeak  = oviChromas.length ? Math.max(...oviChromas) : 0;
    const chromaSwing = range(oviChromas);
    // Optically variable ink CHANGES colour as the angle changes; flat printed
    // ink is whatever colour it is at every angle. So the discriminator is the
    // swing, not the peak. Requiring a low peak as well was what let the fake
    // through: its dome is a saturated print, so peak 0.1351 cleared the bar
    // while its swing was 0.0060 against the genuine note's 0.0566.
    const rollingColour = oviChromas.length >= 2 && chromaSwing < TH_OVI_SWING_FRONT;

    p1.current.colorTone     = colorTone;
    p1.current.clearWindow   = clearWindow;
    p1.current.rollingColour = rollingColour;

    console.log(`[P1 Final] frames=${oviChromas.length} chromaPeak=${chromaPeak.toFixed(4)} chromaSwing=${chromaSwing.toFixed(4)} winVar=${winVar.toFixed(4)} ratioSwing=${ratioSwing.toFixed(4)} → tone=${colorTone} window=${clearWindow} rolling=${rollingColour}`);
    updateCheck("Color Tone",     colorTone     ? "fail" : "pass");
    updateCheck("Clear Window",   clearWindow   ? "fail" : "pass");
    updateCheck("Rolling Colour", rollingColour ? "fail" : "pass");
  };

  // ─── STEP 4: Phase 2 tilt (back) ─────────────────────────────────────────
  const startPhase2 = () => {
    setPhase("phase2");
    setProgress(0);
    setTiltHint(0);
    setMotionStatus("move");
    resetMotion();
    busyRef.current = false;

    intervalRef.current = setInterval(async () => {
      const done = p2.current.sharpnesses.length;
      if (done >= TARGET_FRAMES) {
        stopInterval();
        await finalizePhase2();
        return;
      }
      if (!cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
        // One photo per tick, reused for both purposes — see the note in
        // startPhase1 above. The two-photo split made this phase slower, not
        // faster: shutter time is set by the camera hardware, and doubling
        // the number of shutter calls per accepted frame cost more than the
        // lower JPEG quality on the poll shot ever saved.
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.7, skipProcessing: true, shutterSound: false,
        });
        if (!photo?.base64) return;
        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));

        const thumb = frameThumbnail(raw, p1.current.denomination);
        const motion  = frameMotion(motionPrevThumb.current, thumb);
        const stalled = motionStallRef.current >= MOTION_STALL_LIMIT;
        motionPrevThumb.current = thumb;
        motionStallRef.current += 1;

        if (!stalled && motion >= MOTION_MOVE_THRESHOLD) {
          motionSawMove.current = true;
          setMotionStatus("move");
          return;
        }
        if (!stalled && (motion >= MOTION_STILL_THRESHOLD || !motionSawMove.current)) {
          setMotionStatus(motionSawMove.current ? "hold" : "move");
          return;
        }

        const f = analyzePhase2Frame(raw, p1.current.denomination);
        p2.current.oviChromas.push(f.oviChroma);
        p2.current.sharpnesses.push(f.sharpness);
        p2.current.details.push(f.detail);
        p2.current.numeralPatches.push(f.numeralPatch);
        if (photo.uri && f.oviChroma > p2.current.bestChroma) {
          p2.current.bestChroma = f.oviChroma;
          p2.current.bestUri    = photo.uri;
          p2.current.bestW      = photo.width  ?? 0;
          p2.current.bestH      = photo.height ?? 0;
        }

        const next = p2.current.sharpnesses.length;
        setProgress(Math.min(next / TARGET_FRAMES, 1));
        setMotionStatus("captured");
        resetMotion();
        setTiltHint(h => (h + 1) % TILT_HINTS.length);
      } catch {} finally { busyRef.current = false; }
    }, POLL_INTERVAL_MS);
  };

  const finalizePhase2 = async () => {
    const { oviChromas, sharpnesses, details } = p2.current;

    // ── Reversing numeral ──
    // The genuine feature swaps between "5" and a mirrored "5" depending on
    // which side light rakes across the dome, so the test is whether the dome's
    // PATTERN changes across the tilt. Text recognition is not used: the dome
    // is holographic and low-contrast, and OCR returned nothing from any of
    // four candidate crops at 1400px, on both the genuine note and the fake.
    const numeralDiff   = maxPatchDifference(p2.current.numeralPatches);
    const numeralStates = countDistinctStates(p2.current.numeralPatches, TH_PATCH_SAME);
    const numeralRead   = p2.current.numeralPatches.length >= 2;
    // A genuine dome takes more than one appearance across the rock — blank,
    // reversed, normal. A printed dome has exactly one at every angle.
    p2.current.reversedOk     = numeralStates >= TH_MIN_STATES;
    p2.current.reverseSawText = numeralRead;
    console.log(
      `[Reverse] frames=${p2.current.numeralPatches.length} states=${numeralStates} ` +
      `patternDiff=${numeralDiff.toFixed(4)} ` +
      `dists=[${patchDistances(p2.current.numeralPatches).map(d => d.toFixed(3)).join(" ")}] ` +
      `→ reversedOk=${p2.current.reversedOk}`,
    );

    // The old text-recognition attempt is kept behind the log only, so the
    // band sweep can still be inspected while the pattern test is calibrated.
    if (p2.current.bestUri && p2.current.bestW && p2.current.bestH) {
      await readReversedNumeral(
        p2.current.bestUri, p2.current.bestW, p2.current.bestH, p1.current.denomination,
      );
    }

    // Dynamic movement — same peak-and-swing test as rolling colour
    const chromaPeak      = oviChromas.length ? Math.max(...oviChromas) : 0;
    const chromaSwing     = range(oviChromas);
    // Same reasoning as rolling colour: a feature that does not change with
    // angle is not an optically variable feature, whatever colour it is.
    const dynamicMovement = oviChromas.length >= 2 && chromaSwing < TH_OVI_SWING_BACK;

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

    console.log(`[P2 Final] frames=${sharpnesses.length} chromaPeak=${chromaPeak.toFixed(4)} chromaSwing=${chromaSwing.toFixed(4)} detail=${detail.toFixed(4)} sharp=${sharpness.toFixed(4)}`);

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
    // The mirrored numeral is a discrete reading rather than a threshold, so a
    // clean result is strong evidence either way. It is only counted when the
    // read succeeded at all — a silent OCR failure must not condemn a note.
    // Only counts when OCR actually read something. Two empty readings mean
    // the crop missed the numeral or could not resolve it — that is a failure
    // of the check, not evidence against the note, and must not be scored.
    const reverseRead = !!p2.current.reverseSawText;
    const reverseFail = reverseRead && !p2.current.reversedOk;

    // Weighted by how cleanly each measure separated the matched pair scanned
    // back to back under one lamp. Colour swing on the front is the widest gap
    // this project has measured (9.4x) and the only one whose direction was
    // predicted from the physics before the data existed, so it leads.
    const score =
      (rollingColour   ? 0.40 : 0) +  // front colour swing — 0.0566 vs 0.0060
      (dynamicMovement ? 0.20 : 0) +  // back colour swing — 0.0150 vs 0.0062
      (bumpPattern     ? 0.20 : 0) +  // sharpness — 0.0535 vs 0.0152
      (flyingBirdFail  ? 0.10 : 0) +  // confounded by hand movement, see below
      (colorTone       ? 0.05 : 0) +
      (reverseFail     ? 0.05 : 0) +  // pattern test still uncalibrated
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
      `  9 Reversed "${p1.current.denomination ?? "?"}"  : ${reverseRead ? mark(reverseFail) : "NOT READ — check not working"}\n` +
      `  ─────────────────────\n` +
      `  Risk score      : ${score.toFixed(2)} / 1.00  (fail above 0.40)\n` +
      `  ML denom conf   : ${p1.current.mlScore.toFixed(3)}  (identification only)\n` +
      `  VERDICT         : ${verdict}\n` +
      `═════════════════════════\n` +
      `  raw: birdRatioSwing=${range(birdRatio.current).toFixed(4)} ` +
      `birdVarSwing=${range(birdVariance.current).toFixed(4)} ` +
      `birdVar=${range(birdBrightness.current).toFixed(4)}(n=${birdBrightness.current.length}) ` +
      `p1Peak=${p1.current.oviChromas.length ? Math.max(...p1.current.oviChromas).toFixed(4) : "0"}(n=${p1.current.oviChromas.length}) ` +
      `p1Swing=${range(p1.current.oviChromas).toFixed(4)} ` +
      `winRatioSwing=${range(p1.current.winRatios).toFixed(4)} ` +
      `numeralDiff=${numeralDiff.toFixed(4)} p2Peak=${chromaPeak.toFixed(4)} p2Swing=${chromaSwing.toFixed(4)} detail=${detail.toFixed(4)} sharp=${sharpness.toFixed(4)}\n`
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
      // Every check the console report lists, so the result screen and the log
      // can never disagree. reversedNumeral is null when OCR read nothing.
      pixelChecks:  {
        colorTone, clearWindow, dynamicMovement, dynamicImage3d, rollingColour, bumpPattern,
        flyingBird: flyingBirdFail,
        reversedNumeral: reverseRead ? reverseFail : null,
      },
    });
  };

  // ─── Shared pieces ───────────────────────────────────────────────────────
  // The only status text on the bird/tilt screens — three short states, no
  // instructions to read, since capture is automatic and needs none.
  const MotionStatusLine = ({ status, accent }: { status: "move" | "hold" | "captured"; accent: string }) => (
    <Text style={[styles.sheetSub, { color: status === "captured" ? "#4ADE80" : accent, fontWeight: "700" }]}>
      {status === "move" ? "Move the note there…" : status === "hold" ? "Hold it…" : "✓ Captured"}
    </Text>
  );

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
      <View style={[styles.frame, { height: frameHeightFor(denom) }]}>
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
    const dir = TILT_HINTS[tiltHint];
    return (
      <View style={styles.root}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torchOn} onCameraReady={onCameraReady} />
        <View style={styles.scrim} pointerEvents="none" />

        <TopBar step={1} onClose={() => { stopInterval(); setTorchOn(false); navigation.goBack(); }} />

        <NoteFrame>
          {/* Positioned at the centre of the window zone — the same band the
              bird check actually measures — rather than just the middle of
              the frame, so this is a real target to line the note's own
              bird graphic up against, not a decoration. */}
          {(() => {
            const win = zonesFor(denom).window;
            const cx  = ((win.x0 + win.x1) / 2) * 100;
            const cy  = ((win.y0 + win.y1) / 2) * 100;
            return (
              <View style={[styles.birdBadge, {
                borderColor: accent, backgroundColor: `${accent}22`,
                position: "absolute", left: `${cx}%`, top: `${cy}%`,
                marginLeft: -42, marginTop: -42,
              }]}>
                <Text style={styles.birdIcon}>🦅</Text>
              </View>
            );
          })()}
        </NoteFrame>

        <View style={styles.hintFloat} pointerEvents="none">
          <Text style={[styles.hintArrow, { color: accent }]}>{dir.arrow}</Text>
          <Text style={[styles.hintLabel, { color: accent }]}>{dir.label}</Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Flying Bird</Text>
              <MotionStatusLine status={motionStatus} accent={accent} />
            </View>
            <View style={[styles.torchChip, { borderColor: accent }]}>
              <Text style={[styles.torchText, { color: accent }]}>⚡ FLASH ON</Text>
            </View>
          </View>

          <ProgressBar />
          <Text style={styles.tip}>Line up the note's bird in the circle, then tilt</Text>
          <Text style={styles.tip}>{Math.round(progress * TARGET_FRAMES)}/{TARGET_FRAMES} captured</Text>
        </View>
      </View>
    );
  }
  // ─── SETUP: how to hold the note, shown once before every scan ─────────────
  // Three rules, chosen because they are the three things that varied most
  // between repeat scans of the same note in testing: how far the note sits
  // from the camera, how flat it's held, and how fast it's tilted. Nothing
  // downstream can correct for these after the photo is taken.
  if (phase === "setup") {
    return (
      <View style={styles.root}>
        <View style={styles.sheetOverlay}>
          <Text style={styles.bigTitle}>HOW TO SCAN</Text>
          <Text style={styles.bigSub}>Three things keep every scan consistent</Text>

          <View style={styles.setupList}>
            <View style={styles.setupRow}>
              <View style={[styles.setupIcon, { borderColor: accent }]}>
                <Text style={[styles.setupIconText, { color: accent }]}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.setupHead}>Same distance every time</Text>
                <Text style={styles.setupBody}>Fill the frame guide with the note — not closer, not further. About one hand's length away.</Text>
              </View>
            </View>
            <View style={styles.setupRow}>
              <View style={[styles.setupIcon, { borderColor: accent }]}>
                <Text style={[styles.setupIconText, { color: accent }]}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.setupHead}>Rest your elbow on something</Text>
                <Text style={styles.setupBody}>A table or your other hand. A steadier grip means a cleaner reading.</Text>
              </View>
            </View>
            <View style={styles.setupRow}>
              <View style={[styles.setupIcon, { borderColor: accent }]}>
                <Text style={[styles.setupIconText, { color: accent }]}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.setupHead}>Tilt a real amount, not a wobble</Text>
                <Text style={styles.setupBody}>The app captures on its own — no tapping. Just tilt the note the way the arrow shows and hold it a moment; a small wobble won't catch the colour-shift effect at all.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.btn, styles.btnWide, { backgroundColor: accent }]} onPress={beginScan}>
            <Text style={styles.btnText}>START SCANNING</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 14 }}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
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
              {found ? "CONTINUING…" : "SKIP & CONTINUE"}
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
          style={styles.zoneOviBand}
          label={isPhase2 ? "COLOUR-SHIFTING FEATURES" : "CLEAR WINDOW & COLOUR SHIFT"}
        />
      </NoteFrame>

      {/* Static direction indicator: one position to hold the note at. No tap
          needed — the app watches the camera and captures on its own once it
          sees the note get there and stop moving. */}
      <View style={styles.hintFloat} pointerEvents="none">
        <Text style={[styles.hintArrow, { color: accent }]}>{TILT_HINTS[tiltHint].arrow}</Text>
        <Text style={[styles.hintLabel, { color: accent }]}>{TILT_HINTS[tiltHint].label}</Text>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>{isPhase2 ? "Back Side" : "Front Side"}</Text>
            <MotionStatusLine status={motionStatus} accent={accent} />
          </View>
          {serial ? (
            <View style={styles.serialTag}>
              <Text style={styles.serialTagLabel}>SERIAL</Text>
              <Text style={styles.serialTagValue}>{serial}</Text>
            </View>
          ) : null}
        </View>

        <ProgressBar />
        <Text style={styles.tip}>{Math.round(progress * TARGET_FRAMES)}/{TARGET_FRAMES} captured</Text>

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
  frame:     { width: FRAME_W, alignItems: "center", justifyContent: "center" },
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
  zoneOviBand:    { top: "36%",   left: "5%",  right: "5%",  height: "34%" },

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

  // ── Setup screen ──
  setupList: { width: "100%", gap: 22, marginTop: 30, marginBottom: 34 },
  setupRow:  { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  setupIcon: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  setupIconText: { fontSize: 13, fontWeight: "900" },
  setupHead: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 3 },
  setupBody: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 19 },
});
