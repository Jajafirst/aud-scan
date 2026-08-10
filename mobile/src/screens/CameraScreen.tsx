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
import { fetch as tfFetch } from "@tensorflow/tfjs-react-native";

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/Z11VY1264/";
const CONFIDENCE_THRESHOLD = 0.7;

const DENOM_MAP: Record<string, number> = {
  "FIVE DOLLARS": 5,
  "TEN DOLLARS": 10,
  "TWENTY DOLLARS": 20,
  "FIFTY DOLLARS": 50,
  "ONE HUNDRED DOLLARS": 100,
};

function parseDenomFromOCR(text: string): number | null {
  const upper = text.toUpperCase();
  for (const phrase of Object.keys(DENOM_MAP)) {
    if (upper.includes(phrase)) return DENOM_MAP[phrase];
  }
  return null;
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);
  const serialRef = useRef<string | null>(null);
  const denomRef = useRef<number | null>(null);
  const modelRef = useRef<tf.LayersModel | null>(null);
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
          base64: true, quality: 0.7, skipProcessing: true,
        });
        if (!photo?.uri || !photo?.base64) return;

        const ocr = await TextRecognition.recognize(photo.uri);
        const allText = ocr.blocks.map((b: any) => b.text).join(" ");

        const foundDenom = parseDenomFromOCR(allText);
        if (foundDenom && !denomRef.current) {
          denomRef.current = foundDenom;
          setDenom(foundDenom);
        }

        const clean = allText.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ");
        const serialMatch = clean.match(/([A-Z]{2})\s*((?:\d\s*){8,9})/);
        if (serialMatch && !serialRef.current) {
          const s = serialMatch[1] + " " + serialMatch[2].replace(/\s/g, "");
          serialRef.current = s;
          setSerial(s);
        }

        const raw = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));
        const scores: number[] = tf.tidy(() => {
          const img = decodeJpeg(raw, 3);
          const resized = tf.image.resizeBilinear(img, [224, 224]);
          const norm = resized.toFloat().div(255).expandDims(0);
          const out = modelRef.current!.predict(norm) as tf.Tensor;
          return Array.from(out.dataSync());
        });

        const topScore = Math.max(...scores);
        const isGenuine = topScore >= CONFIDENCE_THRESHOLD;

        if (denomRef.current) {
          const finalDenom = denomRef.current;
          const verdict: "PASS" | "REVIEW" = isGenuine ? "PASS" : "REVIEW";

          doneRef.current = true;
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          triggerHaptic(verdict);

          await addScan({
            id: Date.now().toString(),
            denomination: finalDenom,
            verdict,
            timestamp: new Date().toISOString(),
            serialNumber: serialRef.current ?? "",
          });

          navigation.navigate("Verdict", {
            status: verdict,
            serialNumber: serialRef.current ?? "",
            denomination: finalDenom,
            confidence: topScore,
          });

          serialRef.current = null;
          denomRef.current = null;
          setSerial(null);
          setDenom(null);
        }
      } catch (e: any) {
        // Silently continue on frame errors
      }
    }, 1500);
  };

  useEffect(() => {
    (async () => {
      try {
        await tf.ready();
        modelRef.current = await tf.loadLayersModel(`${MODEL_URL}model.json`);
        const dummy = tf.zeros([1, 224, 224, 3]);
        modelRef.current.predict(dummy);
        dummy.dispose();
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
});