import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Shield, Lock, Eye, Database } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';

export function PrivacyCenter() {
  const navigation = useNavigation<any>();
  const { isHighContrastEnabled } = useAccessibility();
  const hc = isHighContrastEnabled;

  const points = [
    { Icon: Lock, title: 'On-Device Only', desc: 'All image processing runs on your device. No banknote images are ever sent to a server.' },
    { Icon: Eye, title: 'Zero Identity Extraction', desc: 'We collect no personal information, location data, or device identifiers.' },
    { Icon: Database, title: 'Local Storage Only', desc: 'Scan history is stored locally and can be deleted at any time from Settings.' },
    { Icon: Shield, title: 'No Third-Party Analytics', desc: 'AUDScan does not use advertising SDKs, crash reporters, or any third-party tracking.' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={hc ? '#CCFF00' : Theme.colors.textMid} />
        </TouchableOpacity>
        <Text style={[styles.title, hc && { color: '#CCFF00' }]}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        <Text style={[styles.intro, hc && { color: '#fff' }]}>
          AUDScan is built with privacy as the foundation. Here is exactly what we do — and don't do — with your data.
        </Text>
        {points.map(({ Icon, title, desc }) => (
          <View key={title} style={[styles.card, hc && { borderColor: '#CCFF00', borderWidth: 2, backgroundColor: '#000' }]}>
            <View style={[styles.iconWrap, hc && { borderColor: '#CCFF00', borderWidth: 1 }]}>
              <Icon size={20} color={hc ? '#CCFF00' : Theme.colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, hc && { color: '#CCFF00' }]}>{title}</Text>
              <Text style={[styles.cardDesc, hc && { color: '#ddd' }]}>{desc}</Text>
            </View>
          </View>
        ))}
        <Text style={[styles.footer, hc && { color: '#aaa' }]}>Last updated: June 2026.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  intro: { fontSize: 14, color: Theme.colors.textMid, lineHeight: 22 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: Theme.colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, padding: 16, alignItems: 'flex-start' },
  iconWrap: { width: 40, height: 40, backgroundColor: 'rgba(212,168,67,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Theme.colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: Theme.colors.textMid, lineHeight: 19 },
  footer: { fontSize: 11, color: Theme.colors.textDim, textAlign: 'center', paddingTop: 8 },
});
