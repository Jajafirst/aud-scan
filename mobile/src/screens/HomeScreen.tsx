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
  const bg = hc ? '#000' : Theme.colors.background;
  const goldColor = hc ? '#CCFF00' : Theme.colors.gold;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={bg} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.logo, { color: goldColor }]}>AUDScan</Text>
            <View style={[styles.badge, { borderColor: 'rgba(212,168,67,0.25)', backgroundColor: 'rgba(212,168,67,0.1)' }]}>
              <Text style={[styles.badgeText, { color: Theme.colors.goldText }]}>AI-ASSISTED VERIFICATION</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={20} color={Theme.colors.textMid} />
            {unreadCount > 0 && (
              <View style={styles.badge2}>
                <Text style={styles.badgeNum}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {latestAlert && (
          <TouchableOpacity style={styles.alertBanner} onPress={() => navigation.navigate('Alerts')}>
            <View style={styles.alertIcon}><AlertTriangle size={20} color={Theme.colors.red} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertState}>{latestAlert.state} Alert</Text>
              <Text style={styles.alertTitle} numberOfLines={2}>{latestAlert.title}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.scanCenter}>
          <TouchableOpacity onPress={() => navigation.navigate('Scan')} style={styles.scanBtn} accessibilityLabel="Scan a banknote">
            <View style={styles.scanIconWrap}><Camera size={32} color={Theme.colors.background} /></View>
            <Text style={styles.scanLabel}>Scan a Note</Text>
            <View style={styles.scanHint}>
              <Text style={styles.scanHintText}>Start Verification</Text>
              <ChevronRight size={12} color="rgba(8,11,15,0.6)" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.recentHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <History size={14} color={Theme.colors.textDim} />
            <Text style={styles.recentLabel}>RECENT SCANS</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ScanHistory')}>
            <Text style={[styles.viewAll, { color: goldColor }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow} contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
          {recentScans.length > 0 ? recentScans.map(scan => (
            <TouchableOpacity key={scan.id} style={styles.scanCard} onPress={() => navigation.navigate('ScanHistory', { selectedId: scan.id })}>
              <View style={styles.scanCardTop}>
                <View style={styles.denomBadge}><Text style={styles.denomText}>${scan.denomination}</Text></View>
                <View style={[styles.verdictDot, { backgroundColor: scan.verdict === 'PASS' ? Theme.colors.green : Theme.colors.red }]} />
              </View>
              <Text style={styles.timeText}>{formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}</Text>
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
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginTop: 4 },
  badgeText: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  bellBtn: { padding: 10, backgroundColor: Theme.colors.surface2, borderRadius: 999, borderWidth: 1, borderColor: Theme.colors.border },
  badge2: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, backgroundColor: Theme.colors.red, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeNum: { color: '#fff', fontSize: 9, fontWeight: '900' },
  alertBanner: { backgroundColor: 'rgba(240,90,90,0.10)', borderWidth: 1, borderColor: 'rgba(240,90,90,0.30)', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 14, marginBottom: 28 },
  alertIcon: { width: 40, height: 40, backgroundColor: 'rgba(240,90,90,0.20)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertState: { fontSize: 10, fontWeight: '900', color: Theme.colors.red, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 },
  alertTitle: { fontSize: 13, color: Theme.colors.textMid, lineHeight: 18 },
  scanCenter: { alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  scanBtn: { width: 220, height: 220, borderRadius: 40, backgroundColor: Theme.colors.gold, alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: Theme.colors.gold, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  scanIconWrap: { width: 64, height: 64, backgroundColor: 'rgba(8,11,15,0.1)', borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  scanLabel: { color: Theme.colors.background, fontWeight: '900', fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  scanHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scanHintText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(8,11,15,0.6)' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recentLabel: { fontSize: 10, color: Theme.colors.textDim, fontWeight: '700', letterSpacing: 2 },
  viewAll: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  scrollRow: { marginHorizontal: -24, paddingLeft: 24 },
  scanCard: { minWidth: 130, padding: 14, backgroundColor: Theme.colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, gap: 10 },
  scanCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  denomBadge: { width: 34, height: 34, backgroundColor: Theme.colors.background, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  denomText: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMid },
  verdictDot: { width: 8, height: 8, borderRadius: 4 },
  timeText: { fontSize: 10, color: Theme.colors.textDim, textTransform: 'uppercase', marginBottom: 2 },
  verdictText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  emptyScans: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, opacity: 0.3, gap: 6 },
  emptyText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700', color: Theme.colors.textDim },
});
