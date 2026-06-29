import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Bell, AlertTriangle, ChevronRight, History } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAlerts } from '../contexts/AlertContext';
import { useHistory } from '../contexts/HistoryContext';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const { filteredAlerts, unreadCount } = useAlerts();
  const { scans } = useHistory();
  const latestAlert = filteredAlerts[0];
  const recentScans = scans.slice(0, 5);
  const hc = isHighContrastEnabled;
  const goldColor = hc ? '#CCFF00' : Theme.colors.gold;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.logo, { color: goldColor }, isLargeTextEnabled && { fontSize: 38 }]}>AUDScan</Text>
            <Text style={[styles.tagline, { color: hc ? '#CCFF00' : Theme.colors.goldText }]}>AI-ASSISTED VERIFICATION</Text>
          </View>
          <TouchableOpacity style={[styles.bellBtn, hc && { borderColor: '#CCFF00', borderWidth: 2 }]} onPress={() => navigation.navigate('Alerts')}>
            <Bell size={20} color={hc ? '#CCFF00' : Theme.colors.textMid} />
            {unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeNum}>{unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {latestAlert && (
          <TouchableOpacity style={[styles.alertBanner, hc && { backgroundColor: '#000', borderColor: '#CCFF00', borderWidth: 2 }]} onPress={() => navigation.navigate('Alerts')}>
            <AlertTriangle size={20} color={hc ? '#CCFF00' : Theme.colors.red} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertState, hc && { color: '#CCFF00' }]}>{latestAlert.state} Alert</Text>
              <Text style={[styles.alertTitle, hc && { color: '#fff' }]} numberOfLines={1}>{latestAlert.title}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.scanCenter}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Scan')}
            style={[styles.scanBtn, hc && { backgroundColor: '#CCFF00', borderWidth: 8, borderColor: '#000' }]}
            accessibilityLabel="Scan a banknote"
          >
            <Camera size={32} color={hc ? '#000' : Theme.colors.background} />
            <Text style={[styles.scanLabel, hc && { color: '#000' }]}>Scan a Note</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.scanHint, hc && { color: 'rgba(0,0,0,0.8)' }]}>Start Verification</Text>
              <ChevronRight size={12} color={hc ? 'rgba(0,0,0,0.8)' : 'rgba(8,11,15,0.6)'} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.recentHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <History size={14} color={hc ? '#CCFF00' : Theme.colors.textDim} />
            <Text style={[styles.recentLabel, hc && { color: '#fff' }]}>RECENT SCANS</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ScanHistory')}>
            <Text style={[styles.viewAll, { color: goldColor }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow} contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
          {recentScans.length > 0 ? recentScans.map(scan => (
            <TouchableOpacity key={scan.id} style={[styles.scanCard, hc && { backgroundColor: '#000', borderColor: '#CCFF00', borderWidth: 2 }]} onPress={() => navigation.navigate('ScanHistory', { selectedId: scan.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.denomText, hc && { color: '#CCFF00' }]}>${scan.denomination}</Text>
                <View style={[styles.verdictDot, { backgroundColor: scan.verdict === 'PASS' ? Theme.colors.green : Theme.colors.red }]} />
              </View>
              <Text style={[styles.timeText, hc && { color: '#fff' }]}>{formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}</Text>
              <Text style={[styles.verdictText, { color: scan.verdict === 'PASS' ? Theme.colors.green : Theme.colors.amber }]}>{scan.verdict}</Text>
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyScans}>
              <History size={28} color={Theme.colors.textDim} />
              <Text style={styles.emptyText}>No Scans Yet</Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 24, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo: { fontSize: 30, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  tagline: { fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 4 },
  bellBtn: { padding: 10, backgroundColor: Theme.colors.surface2, borderRadius: 999, borderWidth: 1, borderColor: Theme.colors.border },
  badge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, backgroundColor: Theme.colors.red, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeNum: { color: '#fff', fontSize: 9, fontWeight: '900' },
  alertBanner: { backgroundColor: 'rgba(240,90,90,0.10)', borderWidth: 1, borderColor: 'rgba(240,90,90,0.30)', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 28 },
  alertState: { fontSize: 10, fontWeight: '900', color: Theme.colors.red, textTransform: 'uppercase', letterSpacing: 2 },
  alertTitle: { fontSize: 13, color: Theme.colors.textMid },
  scanCenter: { alignItems: 'center', marginVertical: 24 },
  scanBtn: { width: 220, height: 220, borderRadius: 40, backgroundColor: Theme.colors.gold, alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: Theme.colors.gold, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  scanLabel: { color: Theme.colors.background, fontWeight: '900', fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  scanHint: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(8,11,15,0.6)' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recentLabel: { fontSize: 10, color: Theme.colors.textDim, fontWeight: '700', letterSpacing: 2 },
  viewAll: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  scrollRow: { marginHorizontal: -24, paddingLeft: 24 },
  scanCard: { minWidth: 130, padding: 14, backgroundColor: Theme.colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, gap: 8 },
  denomText: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMid },
  verdictDot: { width: 8, height: 8, borderRadius: 4 },
  timeText: { fontSize: 10, color: Theme.colors.textDim, textTransform: 'uppercase' },
  verdictText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  emptyScans: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, opacity: 0.3, gap: 6 },
  emptyText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700', color: Theme.colors.textDim },
});