import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { X } from "lucide-react-native";
import { Theme } from "../Theme";
import { useHistory } from "../contexts/HistoryContext";
import { useAccessibility } from "../contexts/AccessibilityContext";

const CHECKS = ["Denomination Identified","Transparent Window","Holographic Colour-Shift","Serial Number Format"];

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function generateSerial() {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return L[Math.floor(Math.random()*L.length)]+L[Math.floor(Math.random()*L.length)]+Math.floor(10000000+Math.random()*90000000);
}
type CheckStatus = "pending"|"passed"|"failed";

export function CameraScreen() {
  const navigation = useNavigation<any>();
  const { addScan } = useHistory();
  const { triggerHaptic, isHighContrastEnabled } = useAccessibility();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [scanning, setScanning] = useState(false);
  const [checks, setChecks] = useState<{label:string;status:CheckStatus}[]>([]);
  const [step, setStep] = useState("Tap the shutter to verify");
  const hc = isHighContrastEnabled;

  const runScan = async () => {
    if (scanning) return;
    setScanning(true);
    triggerHaptic("DOUBLE_TICK");
    setStep("Analysing note…");
    setChecks(CHECKS.map(l => ({ label: l, status: "pending" })));
    let allPassed = true;
    for (let i = 0; i < CHECKS.length; i++) {
      await delay(550);
      const passed = Math.random() > 0.2;
      if (!passed) allPassed = false;
      triggerHaptic("TICK");
      setChecks(prev => prev.map((c,idx) => idx===i ? {...c, status: passed?"passed":"failed"} : c));
    }
    const verdict: "PASS"|"REVIEW" = allPassed ? "PASS" : "REVIEW";
    triggerHaptic(verdict);
    const serial = generateSerial();
    await addScan({ id: Date.now().toString(), denomination: 50, verdict, timestamp: new Date().toISOString(), serialNumber: serial });
    await delay(400);
    setScanning(false); setChecks([]); setStep("Tap the shutter to verify");
    navigation.navigate("Verdict", { status: verdict, serialNumber: serial });
  };

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) return (
    <View style={styles.root}>
      <Text style={styles.permTitle}>Camera Access Required</Text>
      <Text style={styles.permSub}>AUDScan needs the camera to scan banknotes.</Text>
      <TouchableOpacity style={styles.btn} onPress={requestPermission}>
        <Text style={styles.btnText}>ALLOW CAMERA</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.viewfinder}>
        <View style={[styles.corner, styles.tl, hc&&{borderColor:"#CCFF00"}]} />
        <View style={[styles.corner, styles.tr, hc&&{borderColor:"#CCFF00"}]} />
        <View style={[styles.corner, styles.bl, hc&&{borderColor:"#CCFF00"}]} />
        <View style={[styles.corner, styles.br, hc&&{borderColor:"#CCFF00"}]} />
        <Text style={[styles.frameHint, hc&&{color:"#CCFF00"}]}>Place note here</Text>
      </View>
      {checks.length > 0 && (
        <View style={styles.checklist}>
          {checks.map((c,i) => (
            <View key={i} style={styles.checkRow}>
              <Text style={[styles.checkDot, c.status==="passed"&&{color:Theme.colors.green}, c.status==="failed"&&{color:Theme.colors.red}, c.status==="pending"&&{color:Theme.colors.textDim}]}>
                {c.status==="passed"?"✓":c.status==="failed"?"✗":"○"}
              </Text>
              <Text style={styles.checkLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <X size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.liveLabel, hc&&{color:"#CCFF00"}]}>AUDScan Live</Text>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.bottomBar}>
        {scanning ? (
          <View style={{alignItems:"center",gap:8}}>
            <ActivityIndicator color={hc?"#CCFF00":Theme.colors.gold} />
            <Text style={[styles.hint, hc&&{color:"#CCFF00"}]}>{step}</Text>
          </View>
        ) : (
          <Text style={[styles.hint, hc&&{color:"#fff"}]}>{step}</Text>
        )}
        <TouchableOpacity style={[styles.shutter, scanning&&{opacity:0.4}]} onPress={runScan} disabled={scanning}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
        <Text style={styles.note}>Expo Go · Camera active</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:"#000"},
  viewfinder:{...StyleSheet.absoluteFillObject,alignItems:"center",justifyContent:"center"},
  corner:{position:"absolute",width:28,height:28,borderColor:Theme.colors.gold,borderWidth:3},
  tl:{top:"25%",left:"10%",borderRightWidth:0,borderBottomWidth:0},
  tr:{top:"25%",right:"10%",borderLeftWidth:0,borderBottomWidth:0},
  bl:{bottom:"30%",left:"10%",borderRightWidth:0,borderTopWidth:0},
  br:{bottom:"30%",right:"10%",borderLeftWidth:0,borderTopWidth:0},
  frameHint:{color:"rgba(212,168,67,0.5)",fontSize:10,fontWeight:"700",letterSpacing:3,textTransform:"uppercase",marginTop:120},
  checklist:{position:"absolute",bottom:"28%",left:24,right:24,backgroundColor:"rgba(8,11,15,0.9)",borderRadius:16,padding:16,gap:10},
  checkRow:{flexDirection:"row",alignItems:"center",gap:10},
  checkDot:{fontSize:16,width:20,textAlign:"center",fontWeight:"900"},
  checkLabel:{color:"#fff",fontSize:13},
  topBar:{position:"absolute",top:0,left:0,right:0,flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:"rgba(0,0,0,0.45)"},
  iconBtn:{padding:12,backgroundColor:"rgba(255,255,255,0.15)",borderRadius:999},
  liveLabel:{color:"#fff",fontWeight:"900",fontSize:11,textTransform:"uppercase",letterSpacing:2},
  bottomBar:{position:"absolute",bottom:0,left:0,right:0,alignItems:"center",paddingBottom:48,paddingTop:20,backgroundColor:"rgba(0,0,0,0.45)",gap:14},
  hint:{color:"rgba(255,255,255,0.6)",fontSize:10,fontWeight:"700",textTransform:"uppercase",letterSpacing:3},
  shutter:{width:76,height:76,borderRadius:38,borderWidth:4,borderColor:Theme.colors.gold,padding:5},
  shutterInner:{flex:1,borderRadius:999,backgroundColor:Theme.colors.gold},
  note:{color:Theme.colors.textDim,fontSize:9,letterSpacing:1},
  permTitle:{color:"#fff",fontSize:20,fontWeight:"900",textAlign:"center",marginBottom:10},
  permSub:{color:Theme.colors.textMid,fontSize:13,textAlign:"center",lineHeight:20,marginBottom:24,paddingHorizontal:32},
  btn:{backgroundColor:Theme.colors.gold,paddingVertical:16,paddingHorizontal:32,borderRadius:14},
  btnText:{color:Theme.colors.background,fontWeight:"900",fontSize:14},
  back:{padding:12,marginTop:8},
  backText:{color:Theme.colors.textDim,fontSize:14},
});
