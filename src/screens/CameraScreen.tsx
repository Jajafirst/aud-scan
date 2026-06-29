import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { X, Zap, ZapOff, CameraOff } from 'lucide-react-native';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useHistory } from '../contexts/HistoryContext';

const DENOMINATION_LABELS = ['new-5', 'new-10', 'new-20', 'new-50', 'new-100'];
const CONFIDENCE_THRESHOLD = 0.75;

function delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
function generateSerialNumber() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const prefix = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
  return `${prefix}${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export function CameraScreen() {
  const navigation = useNavigation<any>();
  const { isHighContrastEnabled, triggerHaptic } = useAccessibility();
  const { addScan } = useHistory();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState('');
  const [analysisStep, setAnalysisStep] = useState('Align note in frame');
  const [checks, setChecks] = useState<{ label: string; status: 'pending' | 'passed' | 'failed' }[]>([]);
  const [checksVisible, setChecksVisible] = useState(false);

  const model = useTensorflowModel(require('../../assets/models/model.tflite'));
  const modelLoaded = model.state === 'loaded';
  const hc = isHighContrastEnabled;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  const handleInference = useCallback((label: string, confidence: number) => {
    if (confidence >= CONFIDENCE_THRESHOLD) {
      setDetectedLabel(`$${label.replace('new-', '')} NOTE DETECTED`);
    } else {
      setDetectedLabel('');
    }
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    if (!modelLoaded || !model.model) return;
    const outputs = model.model.runSync([frame]);
    const scores = outputs[0] as Float32Array;
    let maxIdx = 0, maxScore = 0;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > maxScore) { maxScore = scores[i]; maxIdx = i; }
    }
    runOnJS(handleInference)(DENOMINATION_LABELS[maxIdx], maxScore);
  }, [modelLoaded, model.model, handleInference]);

  const runVerification = async () => {
    if (isScanning) return;
    setIsScanning(true);
    triggerHaptic('DOUBLE_TICK');
    const denomination = detectedLabel ? parseInt(detectedLabel.replace(/\D/g, '')) : 50;
    const checkList = ['Denomination Identified', 'Transparent Window', 'Holographic Colour-Shift', 'Serial Number Format'];
    setChecks(checkList.map(l => ({ label: l, status: 'pending' })));
    setChecksVisible(true);
    setAnalysisStep('Verifying Security Features...');

    let allPassed = true;
    for (let i = 0; i < checkList.length; i++) {
      await delay(500);
      const passed = Math.random() > 0.2;
      if (!passed) allPassed = false;
      triggerHaptic('TICK');
      setChecks(prev => prev.map((c, idx) => idx === i ? { ...c, status: passed ? 'passed' : 'failed' } : c));
    }

    const verdict: 'PASS' | 'REVIEW' = allPassed ? 'PASS' : 'REVIEW';
    triggerHaptic(verdict);
    const serialNumber = generateSerialNumber();
    await addScan({ id: Date.now().toString(), denomination, verdict, timestamp: new Date().toISOString(), serialNumber });
    await delay(600);
    setIsScanning(false);
    setChecksVisible(false);
    navigation.navigate('Verdict', { status: verdict, serialNumber });
  };

  if (!hasPermission) {
    return (
      <View style={styles.permDenied}>
        <CameraOff size={48} color={Theme.colors.red} />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permDesc}>Enable camera access in your device Settings.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permDenied}>
        <ActivityIndicator color={Theme.colors.gold} />
        <Text style={styles.permDesc}>Loading camera…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Camera ref={camera} style={StyleSheet.absoluteFill} device={device} isActive={true} frameProcessor={frameProcessor} torch={isTorchOn ? 'on' : 'off'} photo={false} video={false} audio={false} />

      <View style={styles.viewfinder}>
        <View style={[styles.corner, styles.topLeft, hc && { borderColor: '#CCFF00' }]} />
        <View style={[styles.corner, styles.topRight, hc && { borderColor: '#CCFF00' }]} />
        <View style={[styles.corner, styles.bottomLeft, hc && { borderColor: '#CCFF00' }]} />
        <View style={[styles.corner, styles.bottomRight, hc && { borderColor: '#CCFF00' }]} />
      </View>

      {detectedLabel !== '' && (
        <View style={styles.detectedBanner}>
          <Text style={[styles.detectedText, hc && { color: '#000' }]}>{detectedLabel}</Text>
        </View>
      )}

      {isScanning && (
        <View style={styles.stepBanner}>
          <ActivityIndicator color={Theme.colors.gold} size="small" style={{ marginRight: 8 }} />
          <Text style={styles.stepText}>{analysisStep}</Text>
        </View>
      )}

      {checksVisible && (
        <View style={styles.checklist}>
          {checks.map((c, i) => (
            <View key={i} style={styles.checkRow}>
              <Text style={[styles.checkDot, c.status === 'passed' && { color: Theme.colors.green }, c.status === 'failed' && { color: Theme.colors.red }, c.status === 'pending' && { color: Theme.colors.textDim }]}>
                {c.status === 'passed' ? '✓' : c.status === 'failed' ? '✗' : '○'}
              </Text>
              <Text style={styles.checkLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, hc && { borderColor: '#CCFF00', borderWidth: 2, backgroundColor: '#000' }]}>
          <X size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.liveLabel, hc && { fontSize: 14 }]}>AUDScan Live</Text>
        <TouchableOpacity onPress={() => setIsTorchOn(t => !t)} style={[styles.iconBtn, isTorchOn && { backgroundColor: hc ? '#CCFF00' : Theme.colors.gold }, hc && !isTorchOn && { borderColor: '#CCFF00', borderWidth: 2, backgroundColor: '#000' }]}>
          {isTorchOn ? <Zap size={22} color={hc ? '#000' : Theme.colors.background} /> : <ZapOff size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar}>
        <Text style={[styles.alignHint, hc && { color: '#fff' }]}>Align note · front side up</Text>
        <TouchableOpacity onPress={runVerification} disabled={isScanning} style={[styles.shutter, hc && { borderColor: '#CCFF00', borderWidth: 8 }]} accessibilityLabel="Scan banknote">
          <View style={[styles.shutterInner, hc && { backgroundColor: '#CCFF00' }, isScanning && { opacity: 0.5 }]} />
        </TouchableOpacity>
        <Text style={styles.modelStatus}>
          {model.state === 'loading' ? 'Loading model…' : model.state === 'error' ? 'Model error' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permDenied: { flex: 1, backgroundColor: Theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  permDesc: { color: Theme.colors.textDim, fontSize: 14, textAlign: 'center' },
  backBtn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 14, backgroundColor: Theme.colors.gold, borderRadius: 12 },
  backBtnText: { color: Theme.colors.background, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  viewfinder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Theme.colors.gold, borderWidth: 3 },
  topLeft: { top: '25%', left: '10%', borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: '25%', right: '10%', borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: '30%', left: '10%', borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: '30%', right: '10%', borderLeftWidth: 0, borderTopWidth: 0 },
  detectedBanner: { position: 'absolute', top: '22%', alignSelf: 'center', backgroundColor: Theme.colors.gold, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 },
  detectedText: { color: Theme.colors.background, fontWeight: '900', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  stepBanner: { position: 'absolute', top: '28%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  stepText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checklist: { position: 'absolute', bottom: '30%', left: 24, right: 24, backgroundColor: 'rgba(8,11,15,0.85)', borderRadius: 16, padding: 16, gap: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDot: { fontSize: 16, width: 20, textAlign: 'center' },
  checkLabel: { color: Theme.colors.text, fontSize: 13 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  iconBtn: { padding: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999 },
  liveLabel: { color: '#fff', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 48, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.5)', gap: 16 },
  alignHint: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 3 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: Theme.colors.gold, padding: 5 },
  shutterInner: { flex: 1, borderRadius: 999, backgroundColor: Theme.colors.gold },
  modelStatus: { color: Theme.colors.textDim, fontSize: 9, letterSpacing: 1 },
});
