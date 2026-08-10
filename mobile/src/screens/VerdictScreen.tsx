import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, AlertTriangle, ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'Verdict'>;

const SECURITY_FEATURES = [
  'Polymer Substrate',
  'Intaglio Print',
  'Microprint Sharpness',
  'Small Clear Window',
  'Seven-pointed Star',
  'Shadow Image',
  'Southern Cross',
];

export function VerdictScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { isHighContrastEnabled, isLargeTextEnabled, triggerHaptic } = useAccessibility();
  const { status = 'REVIEW', serialNumber, denomination } = route.params ?? {};
  const isPass = status === 'PASS';
  const hc = isHighContrastEnabled;
  const didHaptic = useRef(false);

  useEffect(() => {
    if (didHaptic.current) return;
    didHaptic.current = true;
    triggerHaptic(isPass ? 'PASS' : 'REVIEW');
  }, []);

  const handleExport = async () => {
    const featuresText = SECURITY_FEATURES.map(f => `  ${f}: ${isPass ? 'PASS' : 'REVIEW'}`).join('\n');
    await Share.share({
      message: [
        'AUDScan Report',
        `Date: ${new Date().toLocaleString('en-AU')}`,
        `Result: ${status}`,
        denomination ? `Denomination: $${denomination}` : '',
        `Serial: ${serialNumber ?? '—'}`,
        '',
        'Security Features:',
        featuresText,
        '',
        'AUDScan assists verification only. If in doubt, contact your bank or local police.',
      ].filter(Boolean).join('\n'),
      title: 'AUDScan Report',
    });
  };

  const accentColor = isPass ? (hc ? '#CCFF00' : Theme.colors.green) : (hc ? '#CCFF00' : Theme.colors.amber);
  const seriesLabel = denomination && denomination >= 5 ? 'Next Generation' : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Main')}>
          <ChevronLeft size={20} color={hc ? '#CCFF00' : Theme.colors.textMid} />
          <Text style={[styles.backText, hc && { color: '#CCFF00' }]}>Home</Text>
        </TouchableOpacity>

        <View style={[styles.iconCircle, { borderColor: accentColor }]}>
          {isPass
            ? <CheckCircle2 size={52} color={accentColor} />
            : <AlertTriangle size={52} color={accentColor} />}
        </View>

        <Text style={[styles.verdict, { color: accentColor }, isLargeTextEnabled && { fontSize: 44 }]}>
          {status}
        </Text>
        <Text style={[styles.verdictSub, hc && { color: '#fff' }]}>
          {isPass
            ? 'Security features verified. This note appears genuine.'
            : 'One or more features need review. A human check is recommended.'}
        </Text>

        <View style={[styles.detailCard, hc && { borderColor: '#CCFF00' }]}>
          {denomination ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, hc && { color: '#CCFF00' }]}>Denomination</Text>
              <Text style={[styles.denomValue, { color: accentColor }]}>${denomination}</Text>
            </View>
          ) : null}

          {seriesLabel ? (
            <View style={[styles.detailRow, styles.detailRowBorder]}>
              <Text style={[styles.detailLabel, hc && { color: '#CCFF00' }]}>Series</Text>
              <Text style={[styles.detailValue, hc && { color: '#fff' }]}>{seriesLabel}</Text>
            </View>
          ) : null}

          {serialNumber ? (
            <View style={[styles.detailRow, (denomination || seriesLabel) && styles.detailRowBorder]}>
              <Text style={[styles.detailLabel, hc && { color: '#CCFF00' }]}>Serial Number</Text>
              <Text style={[styles.detailValue, styles.monoValue, hc && { color: '#fff' }]}>{serialNumber}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.featuresCard, hc && { borderColor: '#CCFF00' }]}>
          <Text style={[styles.featuresTitle, hc && { color: '#CCFF00' }]}>Security Features</Text>
          {SECURITY_FEATURES.map((feature, i) => (
            <View key={feature} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
              <Text style={[styles.featureName, hc && { color: '#fff' }]}>{feature}</Text>
              <View style={[styles.featureBadge, { backgroundColor: isPass ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)' }]}>
                <Text style={[styles.featureBadgeText, { color: isPass ? Theme.colors.green : Theme.colors.amber }]}>
                  {isPass ? 'PASS' : 'REVIEW'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.disclaimer, hc && { color: '#CCFF00' }]}>
          AUDScan assists verification only. If in doubt, contact your bank or local police.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: hc ? '#CCFF00' : Theme.colors.gold }]}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={[styles.primaryBtnText, hc && { color: '#000' }]}>Scan Another</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
          <Text style={[styles.secondaryBtnText, { color: hc ? '#CCFF00' : Theme.colors.gold }]}>Export Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 24, alignItems: 'center', gap: 16, paddingBottom: 48 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginBottom: 8 },
  backText: { color: Theme.colors.textMid, fontSize: 14 },
  iconCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  verdict: { fontSize: 36, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  verdictSub: { fontSize: 14, color: Theme.colors.textMid, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  detailCard: { width: '100%', backgroundColor: Theme.colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  detailLabel: { fontSize: 11, color: Theme.colors.textDim, textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 13, color: Theme.colors.text, fontWeight: '700' },
  monoValue: { fontFamily: 'monospace', letterSpacing: 1 },
  denomValue: { fontSize: 28, fontWeight: '900' },
  featuresCard: { width: '100%', backgroundColor: Theme.colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  featuresTitle: { fontSize: 11, color: Theme.colors.textDim, textTransform: 'uppercase', letterSpacing: 1.5, padding: 14, paddingBottom: 10 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  featureName: { fontSize: 13, color: Theme.colors.text, flex: 1 },
  featureBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  featureBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  disclaimer: { fontSize: 10, color: Theme.colors.textDim, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: Theme.colors.background, fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.5 },
  secondaryBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  secondaryBtnText: { fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
});