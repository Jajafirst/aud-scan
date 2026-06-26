import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Volume2, Eye, Type } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';

export function AccessibilitySettings() {
  const navigation = useNavigation<any>();
  const { isHighContrastEnabled, setHighContrastEnabled, isHapticsEnabled, setHapticsEnabled, isAudioGuidanceEnabled, setAudioGuidanceEnabled, isLargeTextEnabled, setLargeTextEnabled } = useAccessibility();
  const hc = isHighContrastEnabled;

  const Toggle = ({ label, desc, Icon, value, onChange }: any) => (
    <View style={[styles.row, hc && { borderColor: '#CCFF00' }]}>
      <View style={[styles.iconWrap, hc && { borderColor: '#CCFF00', borderWidth: 1 }]}>
        <Icon size={18} color={hc ? '#CCFF00' : Theme.colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, hc && { color: '#fff' }]}>{label}</Text>
        <Text style={[styles.rowDesc, hc && { color: '#aaa' }]}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: hc ? '#CCFF00' : Theme.colors.gold, false: Theme.colors.border }} thumbColor="#fff" />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={hc ? '#CCFF00' : Theme.colors.textMid} />
        </TouchableOpacity>
        <Text style={[styles.title, hc && { color: '#CCFF00' }]}>Accessibility</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 2, paddingBottom: 48 }}>
        <Text style={[styles.sectionLabel, hc && { color: '#CCFF00' }]}>VISUAL</Text>
        <View style={[styles.section, hc && { borderColor: '#CCFF00', borderWidth: 1, backgroundColor: '#000' }]}>
          <Toggle label="High Contrast Mode" desc="Black & neon-yellow for maximum readability." Icon={Eye} value={isHighContrastEnabled} onChange={setHighContrastEnabled} />
          <Toggle label="Large Text" desc="Increases text size across the app." Icon={Type} value={isLargeTextEnabled} onChange={setLargeTextEnabled} />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 20 }, hc && { color: '#CCFF00' }]}>FEEDBACK</Text>
        <View style={[styles.section, hc && { borderColor: '#CCFF00', borderWidth: 1, backgroundColor: '#000' }]}>
          <Toggle label="Haptic Feedback" desc="Vibration cues during scanning steps." Icon={Eye} value={isHapticsEnabled} onChange={setHapticsEnabled} />
          <Toggle label="Audio Guidance" desc="Voice announcements during verification." Icon={Volume2} value={isAudioGuidanceEnabled} onChange={setAudioGuidanceEnabled} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Theme.colors.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  section: { backgroundColor: Theme.colors.surface2, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderColor: Theme.colors.border },
  iconWrap: { width: 36, height: 36, backgroundColor: 'rgba(212,168,67,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  rowDesc: { fontSize: 11, color: Theme.colors.textDim, marginTop: 1 },
});
