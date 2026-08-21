import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
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

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/Z11VY1264/";

const DENOM_THRESHOLD = 0.35;
const PASS_THRESHOLD = 0.80;

const LABEL_TO_DENOM: Record<string, number> = {
  "new-5": 5,
  "new-10": 10,
  "new-20": 20,
  "new-50": 50,
  "new-100": 100,
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

interface PixelChecks {
  colorTone: boolean;
  clearWindow: boolean;
  dynamicMovement: boolean;
  dynamicImage3d: boolean;
  rollingColour: boolean;
  bumpPattern: boolean;
  score: number;
}

function analyzePixels(raw: Uint8Array): PixelChecks {
  return tf.tidy(() => {
    const img = decodeJpeg(raw, 3);
    const resized = tf.image.resizeBilinear(img, [256, 256]);
    const float = resized.toFloat();

    const r = float.slice([0, 0, 0], [-1, -1, 1]);
    const g = float.slice([0, 0, 1], [-1, -1, 1]);
    const b = float.slice([0, 0, 2], [-1, -1, 1]);
    const gray = r.mul(0.299).add(g.mul(0.587)).add(b.mul(0.114)).div(255);

    const rMean = r.mean().dataSync()[0];
    const gMean = g.mean().dataSync()[0];
    const bMean = b.mean().dataSync()[0];

    // 1. Color Tone
    const rbRatio = bMean > 0 ? rMean / bMean : 1;
    const rgRatio = gMean > 0 ? rMean / gMean : 1;
    const colorTone = rbRatio < 0.85 || rbRatio > 2.2 || rgRatio < 0.7 || rgRatio > 1.8;

    // 2. Clear Window
    const brightPixels = gray.greater(0.85).cast("float32");
    const brightRatio = brightPixels.mean().dataSync()[0];
    const grayMean = gray.mean().dataSync()[0];
    const grayVariance = gray.sub(grayMean).square().mean().dataSync()[0];
    const clearWindow = (brightRatio < 0.04 || brightRatio > 0.55) || grayVariance < 0.015;

    // 3. Dynamic Movement — HALFTONE DOT DETECTION
    const patchSize = 8;
    const patches: number[] = [];
    for (let py = 0; py < 256; py += patchSize) {
      for (let px = 0; px < 256; px += patchSize) {
        const patch = gray.slice([py, px, 0], [patchSize, patchSize, 1]);
        const pMean = patch.mean().dataSync()[0];
        const pVar = patch.sub(pMean).square().mean().dataSync()[0];
        patches.push(pVar);
        patch.dispose();
      }
    }
    const patchVarMean = patches.reduce((a, b) => a + b, 0) / patches.length;
    const patchVarStd = Math.sqrt(patches.reduce((a, v) => a + Math.pow(v - patchVarMean, 2), 0) / patches.length);
    const dynamicMovement = patchVarMean > 0.018 || patchVarStd > 0.015;

    // 4. 3D Dynamic Image — PAPER GRAIN vs POLYMER TEXTURE
    const grayBlurred = tf.avgPool(gray.expandDims(0) as tf.Tensor4D, 3, 1, 'same').squeeze([0]);
    const noiseLayer = gray.sub(grayBlurred).abs();
    const noiseMean = noiseLayer.mean().dataSync()[0];
    const noiseVariance = noiseLayer.sub(noiseMean).square().mean().dataSync()[0];
    const rVar = r.sub(rMean).square().mean().dataSync()[0];
    const gVar = g.sub(gMean).square().mean().dataSync()[0];
    const bVar = b.sub(bMean).square().mean().dataSync()[0];
    const channelVariance = (rVar + gVar + bVar) / 3;
    const dynamicImage3d = noiseMean > 0.035 || noiseVariance > 0.002;

    // 5. Rolling Colour Effect — CMYK COLOR FRINGING
    const rMinusG = r.sub(g).abs();
    const rMinusB = r.sub(b).abs();
    const colorFringe = rMinusG.add(rMinusB);
    const saturation = r.sub(b).abs().add(r.sub(g).abs()).add(g.sub(b).abs());
    const satMean = saturation.mean().dataSync()[0];
    const satVariance = saturation.sub(satMean).square().mean().dataSync()[0];
    const fringeMean = colorFringe.mean().dataSync()[0];
    const fringeVar = colorFringe.sub(fringeMean).square().mean().dataSync()[0];
    const greenPresence = gMean / (rMean + 1);
    const rollingA = satVariance > 1800;
    const rollingB = satMean < 15;
    const rollingC = greenPresence < 0.55 || greenPresence > 1.15;
    const rollingD = fringeVar > 800;
    const rollingColour = rollingA || rollingB || rollingC || rollingD;

    // 6. Bump Patterns — EDGE SHARPNESS (Intaglio)
    const darkRegions = gray.less(0.4).cast("float32");
    const darkMean = gray.mul(darkRegions).mean().dataSync()[0];
    const highFreq = gray.sub(gray.mean()).abs().mean().dataSync()[0];
    const bumpPattern = highFreq < 0.15 || darkMean < 0.02;

    const score =
      (colorTone       ? 0.20 : 0) +
      (clearWindow     ? 0.20 : 0) +
      (dynamicMovement ? 0.15 : 0) +
      (dynamicImage3d  ? 0.15 : 0) +
      (rollingColour   ? 0.20 : 0) +
      (bumpPattern     ? 0.10 : 0);

    console.log(`[PIXEL] ─────── RBA 6-Feature Check ───────`);
    console.log(`[PIXEL] 1. Color Tone        : ${colorTone       ? 'SUSPICIOUS' : 'OK'} | R/B=${rbRatio.toFixed(3)} R/G=${rgRatio.toFixed(3)}`);
    console.log(`[PIXEL] 2. Clear Window      : ${clearWindow     ? 'SUSPICIOUS' : 'OK'} | brightRatio=${brightRatio.toFixed(4)} grayVar=${grayVariance.toFixed(4)}`);
    console.log(`[PIXEL] 3. Dynamic Movement  : ${dynamicMovement ? 'SUSPICIOUS' : 'OK'} | patchVarMean=${patchVarMean.toFixed(5)} patchVarStd=${patchVarStd.toFixed(5)}`);
    console.log(`[PIXEL] 4. 3D Dynamic Image  : ${dynamicImage3d  ? 'SUSPICIOUS' : 'OK'} | noiseMean=${noiseMean.toFixed(5)} noiseVar=${noiseVariance.toFixed(5)}`);
    console.log(`[PIXEL] 5. Rolling Colour    : ${rollingColour   ? 'SUSPICIOUS' : 'OK'} | satVar=${satVariance.toFixed(1)} fringeVar=${fringeVar.toFixed(1)} greenRatio=${greenPresence.toFixed(3)}`);
    console.log(`[PIXEL] 6. Bump Patterns     : ${bumpPattern     ? 'SUSPICIOUS' : 'OK'} | darkMean=${darkMean.toFixed(5)} highFreq=${highFreq.toFixed(4)}`);
    console.log(`[PIXEL] ── SCORE: ${score.toFixed(3)} (≥0.4 = FAKE) ────────────────`);

    return { colorTone, clearWindow, dynamicMovement, dynamicImage3d, rollingColour, bumpPattern, score };
  });
}

export function CameraScreen() {
  const navigation = useNavigation<any>();
  const { addScan } = useHistory();
  const { triggerHaptic, isHighContrastEnabled } = useAccessibility();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const hc = isHighContrastEnabled;

  const [msg, setMsg] = useState("Loading AI model...");
  const [serial, setSerial] = useState<string | null>(null);
  const [denom, setDenom] = useState<number | null>(null);
  const [checks, setChecks] = useState<{ label: string; pass: boolean }[] | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);
  const modelRef = useRef<tf.LayersModel | null>(null);
  const labelsRef = useRef<string[]>([]);
  const modelReadyRef = useRef(false);
  const cameraReadyRef = useRef(false);

  const tryStartLoop = () => {
    if (!modelReadyRef.current || !cameraReadyRef.current) return;
    if (intervalRef.current) return;
    doneRef.current = false;
    setMsg("Scanning… hold note steady");

    intervalRef.current = setInterval(async () => {
      if (doneRef.current || !cameraRef.current || !modelRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.5, skipProcessing: true,
        });
        if (!photo?.uri || !photo?.base64) return;

        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));
        const scores: number[] = tf.tidy(() => {
          const img = decodeJpeg(raw, 3);
          const resized = tf.image.resizeBilinear(img, [224, 224]);
          const norm = resized.toFloat().div(255).expandDims(0);
          const out = modelRef.current!.predict(norm) as tf.Tensor;
          return Array.from(out.dataSync());
        });

        const topIdx = scores.indexOf(Math.max(...scores));
        const topScore = scores[topIdx];
        const topLabel = labelsRef.current[topIdx] ?? "";
        const mlDenom = LABEL_TO_DENOM[topLabel] ?? null;

        console.log("[ML] Scores:", labelsRef.current.map((l, i) => `${l}=${scores[i].toFixed(3)}`).join(" | "));
        console.log(`[ML] Top: label=${topLabel} score=${topScore.toFixed(3)} denom=${mlDenom}`);

        if (mlDenom) setDenom(mlDenom);

        if (topScore >= DENOM_THRESHOLD && mlDenom) {
          doneRef.current = true;
          clearInterval(intervalRef.current!);
          intervalRef.current = null;

          const pixel = analyzePixels(raw);

          const liveChecks = [
            { label: "Color Tone",       pass: !pixel.colorTone },
            { label: "Clear Window",     pass: !pixel.clearWindow },
            { label: "Dynamic Movement", pass: !pixel.dynamicMovement },
            { label: "3D Dynamic Image", pass: !pixel.dynamicImage3d },
            { label: "Rolling Colour",   pass: !pixel.rollingColour },
            { label: "Bump Patterns",    pass: !pixel.bumpPattern },
          ];
          setChecks(liveChecks);

          const mlPass = topScore >= PASS_THRESHOLD;
          const pixelPass = pixel.score < 0.4;
          console.log(`[VERDICT] mlPass=${mlPass} pixelPass=${pixelPass} → ${(mlPass && pixelPass) ? "PASS" : "REVIEW"}`);
          const verdict: "PASS" | "REVIEW" = (mlPass && pixelPass) ? "PASS" : "REVIEW";
          triggerHaptic(verdict);

          let serialNumber = "";
          let ocrDenom: number | null = null;
          try {
            const ocr = await withTimeout(TextRecognition.recognize(photo.uri), 2000);
            if (ocr) {
              const allText = ocr.blocks.map((b: any) => b.text).join(" ");
              const clean = allText.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ");

              if (clean.includes("HUNDRED")) ocrDenom = 100;
              else if (clean.includes("FIFTY")) ocrDenom = 50;
              else if (clean.includes("TWENTY")) ocrDenom = 20;
              else if (clean.includes("TEN")) ocrDenom = 10;
              else if (clean.includes("FIVE")) ocrDenom = 5;

              const serialMatch = clean.match(/([A-Z]{2})\s*((?:\d\s*){8,9})/);
              if (serialMatch) {
                serialNumber = serialMatch[1] + " " + serialMatch[2].replace(/\s/g, "");
                setSerial(serialNumber);
              }
            }
          } catch {}

          const finalDenom = ocrDenom ?? mlDenom;
          setDenom(finalDenom);

          await addScan({
            id: Date.now().toString(),
            denomination: finalDenom,
            verdict,
            timestamp: new Date().toISOString(),
            serialNumber,
          });

          navigation.navigate("Verdict", {
            status: verdict,
            serialNumber,
            denomination: finalDenom,
            confidence: topScore,
            pixelChecks: {
              colorTone: pixel.colorTone,
              clearWindow: pixel.clearWindow,
              dynamicMovement: pixel.dynamicMovement,
              dynamicImage3d: pixel.dynamicImage3d,
              rollingColour: pixel.rollingColour,
              bumpPattern: pixel.bumpPattern,
            },
          });

          setSerial(null);
          setDenom(null);
          setChecks(null);
        }
      } catch (e: any) {
        // Silently continue on frame errors
      }
    }, 800);
  };

  useEffect(() => {
    (async () => {
      try {
        await tf.ready();
        const metaRes = await fetch(`${MODEL_URL}metadata.json`);
        const meta = await metaRes.json();
        labelsRef.current = meta.labels ?? [];
        modelRef.current = await tf.loadLayersModel(`${MODEL_URL}model.json`);
        const dummy = tf.zeros([1, 224, 224, 3]);
        modelRef.current.predict(dummy);
        dummy.dispose();
        console.log("[ML] Model loaded. Labels:", labelsRef.current);
        modelReadyRef.current = true;
        setMsg("Point camera at a banknote");
        tryStartLoop();
      } catch (e: any) {
        setMsg("Model failed: " + e?.message);
      }
    })();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const onCameraReady = () => {
    cameraReadyRef.current = true;
    tryStartLoop();
  };

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>AUDScan needs the camera to scan banknotes.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>ALLOW CAMERA</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={onCameraReady} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => {
          if (intervalRef.current) clearInterval(intervalRef.current);
          navigation.goBack();
        }}>
          <X size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.serialBox}>
          <Text style={styles.serialLabel}>SERIAL NO.</Text>
          <Text style={[styles.serialValue, !serial && { color: "rgba(255,255,255,0.25)" }]}>
            {serial ?? "-- -- -- --"}
          </Text>
        </View>
      </View>

      <View style={styles.viewfinder}>
        <View style={[styles.corner, styles.tl, hc && { borderColor: "#CCFF00" }]} />
        <View style={[styles.corner, styles.tr, hc && { borderColor: "#CCFF00" }]} />
        <View style={[styles.corner, styles.bl, hc && { borderColor: "#CCFF00" }]} />
        <View style={[styles.corner, styles.br, hc && { borderColor: "#CCFF00" }]} />
      </View>

      {checks && (
        <View style={styles.checksOverlay}>
          {checks.map((c) => (
            <View key={c.label} style={styles.checkRow}>
              <Text style={[styles.checkDot, { color: c.pass ? "#4ADE80" : "#FBBF24" }]}>●</Text>
              <Text style={styles.checkLabel}>{c.label}</Text>
              <Text style={[styles.checkStatus, { color: c.pass ? "#4ADE80" : "#FBBF24" }]}>
                {c.pass ? "PASS" : "FAIL"}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomOverlay}>
        <View style={styles.denomCard}>
          <Text style={styles.denomLabel}>DENOMINATION</Text>
          <Text style={styles.denomText}>{denom ? `$${denom}` : "--"}</Text>
        </View>
        <View style={styles.statusBox}>
          <ActivityIndicator size="small" color={Theme.colors.gold} />
          <Text style={styles.hint}>{msg}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: "rgba(0,0,0,0.6)", gap: 16 },
  closeBtn: { padding: 10, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999 },
  serialBox: { flex: 1 },
  serialLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  serialValue: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "monospace", letterSpacing: 2 },
  viewfinder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 32, height: 32, borderColor: Theme.colors.gold, borderWidth: 3 },
  tl: { top: "22%", left: "8%", borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: "22%", right: "8%", borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: "22%", left: "8%", borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: "22%", right: "8%", borderLeftWidth: 0, borderTopWidth: 0 },
  bottomOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", padding: 24, paddingBottom: 48, gap: 12 },
  denomCard: { backgroundColor: "rgba(8,11,15,0.92)", borderRadius: 16, padding: 14, gap: 6, minWidth: 120 },
  denomLabel: { color: "rgba(255,255,255,0.45)", fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  denomText: { color: Theme.colors.gold, fontSize: 40, fontWeight: "900", lineHeight: 44 },
  statusBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(8,11,15,0.7)", borderRadius: 12, padding: 12 },
  hint: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5, flex: 1 },
  permTitle: { color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 10 },
  permSub: { color: Theme.colors.textMid, fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 32 },
  btn: { backgroundColor: Theme.colors.gold, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, marginBottom: 12 },
  btnText: { color: Theme.colors.background, fontWeight: "900", fontSize: 14 },
  backText: { color: Theme.colors.textDim, fontSize: 14, textAlign: "center" },
  checksOverlay: { position: "absolute", bottom: 160, left: 20, right: 20, backgroundColor: "rgba(8,11,15,0.85)", borderRadius: 14, padding: 12, gap: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkDot: { fontSize: 8 },
  checkLabel: { flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  checkStatus: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});