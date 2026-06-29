import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Theme } from "../Theme";
import { useHistory } from "../contexts/HistoryContext";
import { useAccessibility } from "../contexts/AccessibilityContext";

export function CameraScreen() {
  const navigation = useNavigation<any>();
  const { addScan } = useHistory();
  const { triggerHaptic } = useAccessibility();

  const verify = async () => {
    triggerHaptic("DOUBLE_TICK");
    const verdict = Math.random() > 0.3 ? "PASS" : "REVIEW";
    await addScan({ id: Date.now().toString(), denomination: 50, verdict, timestamp: new Date().toISOString(), serialNumber: "AB12345678" });
    navigation.navigate("Verdict", { status: verdict, serialNumber: "AB12345678" });
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>AUDScan Camera</Text>
      <Text style={styles.sub}>(Full camera requires native build)</Text>
      <TouchableOpacity style={styles.btn} onPress={verify}>
        <Text style={styles.btnText}>TAP TO VERIFY</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  title: { color: "#D4A843", fontSize: 24, fontWeight: "900" },
  sub: { color: "#6B8099", fontSize: 12, textAlign: "center" },
  btn: { backgroundColor: "#D4A843", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14 },
  btnText: { color: "#080B0F", fontWeight: "900", fontSize: 14 },
  back: { padding: 12 },
  backText: { color: "#6B8099", fontSize: 14 },
});
