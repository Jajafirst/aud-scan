import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, AlertTriangle, ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'Verdict'>;

const SECURITY_FEATURES: { label: string; check: keyof NonNullable<Route['params']['pixelChecks']> | null }[] = [
  { label: 'Color Tone',                    check: 'colorTone' },
  { label: 'Clear Window (×2)',             check: 'clearWindow' },
  { label: 'Dynamic Movement (Bird/No.)',   check: 'dynamicMovement' },
  { label: '3D Dynamic Image',              check: 'dynamicImage3d' },
  { label: 'Rolling Colour Effect (×3)',    check: 'rollingColour' },
  { label: 'Bump Patterns (Intaglio)',      check: 'bumpPattern' },
];


function formatSerial(serial: string): string {
  if (!serial) return '—';
  const clean = serial.replace(/\s/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return serial;
}

export function VerdictScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { triggerHaptic } = useAccessibility();
  const { status = 'REVIEW', serialNumber, denomination, pixelChecks } = route.params ?? {};  const isPass = status === 'PASS';
  const didHaptic = useRef(false);

  const failedCount = isPass ? 0 : SECURITY_FEATURES.length;
  const passedCount = isPass ? SECURITY_FEATURES.length : 0;

  useEffect(() => {
    if (didHaptic.current) return;
    didHaptic.current = true;
    triggerHaptic(isPass ? 'PASS' : 'REVIEW');
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Main')}>
            <ChevronLeft size={20} color={Theme.colors.textMid} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VERIFICATION RESULT</Text>
          <View style={{ width: 36 }} />
        </View>

        {!isPass && (
          <View style={styles.safetyBanner}>
            <Text style={styles.safetyText}>
              🔴 <Text style={styles.safetyBold}>SAFETY FIRST:</Text> Do not confront or challenge the person who gave you this note. Your personal safety is more valuable than the currency.
            </Text>
          </View>
        )}

        <View style={[styles.iconCircle, { borderColor: isPass ? Theme.colors.green : Theme.colors.amber }]}>
          {isPass
            ? <CheckCircle2 size={52} color={Theme.colors.green} />
            : <AlertTriangle size={52} color={Theme.colors.amber} />}
        </View>

        <Text style={[styles.verdictTitle, { color: isPass ? Theme.colors.green : '#fff' }]}>
          {isPass ? 'GENUINE NOTE' : 'REVIEW NOTE'}
        </Text>
        <Text style={[styles.checksLine, { color: isPass ? Theme.colors.green : Theme.colors.amber }]}>
          {isPass ? `${passedCount} CHECKS PASSED` : `${failedCount} CHECKS FAILED`}
        </Text>
        <Text style={styles.assistedNote}>
          This is an assisted check only. Not certified authentication.
        </Text>

        <View style={styles.identityCard}>
          {denomination ? (
            <View style={styles.denomRow}>
              <Text style={styles.identityLabel}>DENOMINATION</Text>
              <Text style={styles.denomBig}>${denomination}</Text>
            </View>
          ) : null}
          <View style={[styles.identityRow, denomination && styles.identityRowBorder]}>
            <View>
              <Text style={styles.identityLabel}>NOTE IDENTITY</Text>
              <Text style={styles.identitySerial}>{formatSerial(serialNumber ?? '')}</Text>
            </View>
            <View style={styles.identityRight}>
              <Text style={styles.identityLabel}>SERIES</Text>
              <Text style={styles.identityValue}>New Series</Text>
            </View>
          </View>
        </View>

        <View style={styles.auditCard}>
          <Text style={styles.auditTitle}>SECURITY FEATURE AUDIT</Text>
          {SECURITY_FEATURES.map((feature, i) => {
              const pass = feature.check && pixelChecks ? !pixelChecks[feature.check] : isPass;
              return (
                <View key={feature.label} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
                  <Text style={styles.featureName}>{feature.label}</Text>
                  <Text style={[styles.featureBadge, { color: pass ? Theme.colors.green : Theme.colors.amber }]}>
                    {pass ? 'PASS' : 'FAIL'}
                  </Text>
                </View>
              );
            })}
        </View>

        {!isPass && (
          <Text style={styles.disclaimer}>
            Suspected counterfeit notes must be handled with care to preserve forensic evidence. Report suspicious currency immediately to state police or{' '}
            <Text style={styles.disclaimerLink} onPress={() => Linking.openURL('tel:1800333000')}>
              Crime Stoppers on 1800 333 000
            </Text>
            .
          </Text>
        )}

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            🖐 Physical checks still recommended. Remember to Feel the raised print, Look for the clear windows, and Tilt to verify optical shifts.
          </Text>
        </View>

        {!isPass && (
          <View style={styles.reportSection}>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => Linking.openURL('https://www.police.gov.au/')}
            >
              <Text style={styles.reportBtnText}>REPORT TO POLICE →</Text>
            </TouchableOpacity>
            <Text style={styles.reportNote}>
              Reporting here submits data to the local threat map and does not replace filing an official report with state police.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: isPass ? Theme.colors.green : Theme.colors.gold }]}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={styles.scanBtnText}>SCAN ANOTHER</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.colors.background },
  container: { padding: 20, paddingBottom: 48, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.surface2, borderRadius: 18 },
  headerTitle: { color: Theme.colors.textMid, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  safetyBanner: { backgroundColor: 'rgba(255,59,48,0.12)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.4)', borderRadius: 12, padding: 14 },
  safetyText: { color: '#fff', fontSize: 13, lineHeight: 20 },
  safetyBold: { fontWeight: '800' },
  iconCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 8 },
  verdictTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  checksLine: { fontSize: 12, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginTop: 4 },
  assistedNote: { fontSize: 11, color: Theme.colors.textDim, textAlign: 'center' },
  identityCard: { backgroundColor: Theme.colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  denomRow: { padding: 16, paddingBottom: 12 },
  denomBig: { color: Theme.colors.gold, fontSize: 36, fontWeight: '900', lineHeight: 40 },
  identityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 },
  identityRowBorder: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  identityLabel: { fontSize: 9, color: Theme.colors.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  identitySerial: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 2 },
  identityRight: { alignItems: 'flex-end' },
  identityValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  auditCard: { backgroundColor: Theme.colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  auditTitle: { fontSize: 9, color: Theme.colors.textDim, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', padding: 14, paddingBottom: 10 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  featureName: { fontSize: 13, color: '#fff', flex: 1 },
  featureBadge: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  disclaimer: { fontSize: 12, color: Theme.colors.textMid, lineHeight: 18 },
  disclaimerLink: { color: Theme.colors.gold, textDecorationLine: 'underline' },
  tipBox: { backgroundColor: 'rgba(255,204,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,204,0,0.2)', borderRadius: 12, padding: 14 },
  tipText: { color: Theme.colors.textMid, fontSize: 12, lineHeight: 18 },
  reportSection: { alignItems: 'center', gap: 8 },
  reportBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Theme.colors.amber },
  reportBtnText: { color: Theme.colors.amber, fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  reportNote: { fontSize: 10, color: Theme.colors.textDim, textAlign: 'center', lineHeight: 14 },
  scanBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  scanBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
});