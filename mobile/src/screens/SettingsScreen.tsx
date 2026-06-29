import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield, ChevronRight, Accessibility, FileText,
  Trash2, Eye, Volume2, BarChart3, Smartphone,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useHistory } from '../contexts/HistoryContext';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { isHighContrastEnabled, setHighContrastEnabled, isHapticsEnabled, setHapticsEnabled, isAudioGuidanceEnabled, setAudioGuidanceEnabled } = useAccessibility();
  const { clearHistory, isBusinessAccount, setBusinessAccount } = useHistory();
  const [showTerms, setShowTerms] = useState(false);
  const [showAccessStatement, setShowAccessStatement] = useState(false);
  const hc = isHighContrastEnabled;

  const handleDeleteData = () => {
    Alert.alert('Delete All Data', 'This will permanently erase all scan history, preferences, and onboarding state.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Everything', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); clearHistory(); Alert.alert('Done', 'All data has been deleted.'); } },
    ]);
  };

  const row = (label, desc, Icon, color, onPress, right) => (
    <TouchableOpacity key={label} style={[styles.row, hc && { borderColor: '#CCFF00' }]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: color + '22' }]}><Icon size={18} color={hc ? '#CCFF00' : color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, hc && { color: '#fff' }]}>{label}</Text>
        <Text style={[styles.rowDesc, hc && { color: '#ccc' }]}>{desc}</Text>
      </View>
      {right ?? <ChevronRight size={16} color={hc ? '#CCFF00' : Theme.colors.textDim} />}
    </TouchableOpacity>
  );

  const toggle = (value, onChange) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ true: hc ? '#CCFF00' : Theme.colors.gold, false: Theme.colors.border }} thumbColor="#fff" />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <Text style={[styles.title, hc && { color: '#CCFF00' }]}>Settings Hub</Text>
      <Text style={[styles.subtitle, hc && { color: '#CCFF00' }]}>COMPLIANCE & RULES CONTROL</Text>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 48 }}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.sectionTitle, hc && { color: '#CCFF00' }]}>LEGAL & PRIVACY</Text>
          <View style={[styles.sectionBox, hc && { borderColor: '#CCFF00', borderWidth: 1 }]}>
            {row('Privacy Policy', 'Secure on-device data processing.', Shield, Theme.colors.blue, () => navigation.navigate('Privacy'))}
            {row('Terms & Conditions', 'Liability limits and definitions.', FileText, Theme.colors.amber, () => setShowTerms(true))}
            {row('Accessibility Statement', 'Our WCAG 2.1 AA design commitment.', Accessibility, '#a78bfa', () => setShowAccessStatement(true))}
          </View>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={[styles.sectionTitle, hc && { color: '#CCFF00' }]}>PREFERENCES</Text>
          <View style={[styles.sectionBox, hc && { borderColor: '#CCFF00', borderWidth: 1 }]}>
            {row('Accessibility Menu', 'Audio, haptics, and text size.', Accessibility, Theme.colors.green, () => navigation.navigate('AccessibilitySettings'))}
            {row('High Contrast Mode', 'High-visibility colours.', Eye, Theme.colors.goldText, () => {}, toggle(isHighContrastEnabled, setHighContrastEnabled))}
            {row('Haptic Feedback', 'Vibration cues during scanning.', Smartphone, Theme.colors.textMid, () => {}, toggle(isHapticsEnabled, setHapticsEnabled))}
            {row('Audio Guidance', 'Voice announcements.', Volume2, Theme.colors.textMid, () => {}, toggle(isAudioGuidanceEnabled, setAudioGuidanceEnabled))}
            {row('Business Account', 'Merchant-level tracking.', Shield, Theme.colors.blue, () => {}, toggle(isBusinessAccount, setBusinessAccount))}
            {row('Scan Analytics', 'Pass rate stats and trends.', BarChart3, '#8b5cf6', () => navigation.navigate('Analytics'))}
          </View>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={[styles.sectionTitle, hc && { color: '#CCFF00' }]}>DATA</Text>
          <View style={[styles.sectionBox, hc && { borderColor: '#CCFF00', borderWidth: 1 }]}>
            {row('Scan History', 'View past verifications.', FileText, Theme.colors.blue, () => navigation.navigate('ScanHistory'))}
          </View>
        </View>
        <TouchableOpacity style={[styles.deleteBtn, hc && { borderWidth: 4 }]} onPress={handleDeleteData}>
          <Trash2 size={16} color={Theme.colors.red} />
          <Text style={styles.deleteBtnText}>Delete My Data</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={showTerms} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, hc && { backgroundColor: '#000', borderColor: '#CCFF00', borderWidth: 2 }]}>
            <Text style={[styles.modalTitle, hc && { color: '#CCFF00' }]}>Legal Terms & Disclaimer</Text>
            <Text style={[styles.modalBody, hc && { color: '#fff' }]}>AUDScan is an assisted checking tool only. This is not a certified official authentication system. Always compare notes against Reserve Bank of Australia guidelines.</Text>
            <TouchableOpacity style={[styles.closeBtn, hc && { backgroundColor: '#CCFF00' }]} onPress={() => setShowTerms(false)}>
              <Text style={[styles.closeBtnText, hc && { color: '#000' }]}>Close Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showAccessStatement} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, hc && { backgroundColor: '#000', borderColor: '#CCFF00', borderWidth: 2 }]}>
            <Text style={[styles.modalTitle, hc && { color: '#CCFF00' }]}>Accessibility Commitment</Text>
            <Text style={[styles.modalBody, hc && { color: '#fff' }]}>AUDScan is engineered to align with WCAG 2.1 Level AA standards. We employ high-contrast visuals, haptic warnings, and spoken guidance.</Text>
            <TouchableOpacity style={[styles.closeBtn, hc && { backgroundColor: '#CCFF00' }]} onPress={() => setShowAccessStatement(false)}>
              <Text style={[styles.closeBtnText, hc && { color: '#000' }]}>Close Statement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 2 },
  subtitle: { fontSize: 9, fontWeight: '700', color: Theme.colors.textDim, letterSpacing: 3, paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: Theme.colors.textDim, letterSpacing: 2, marginBottom: 6, paddingLeft: 2 },
  sectionBox: { backgroundColor: Theme.colors.surface2, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderColor: Theme.colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  rowDesc: { fontSize: 11, color: Theme.colors.textDim, marginTop: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.red, backgroundColor: 'rgba(240,90,90,0.08)' },
  deleteBtnText: { color: Theme.colors.red, fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  modalBody: { fontSize: 13, color: Theme.colors.textMid, lineHeight: 20 },
  closeBtn: { backgroundColor: Theme.colors.gold, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { color: Theme.colors.background, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
});
