import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, BarChart3, TrendingUp, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useHistory } from '../contexts/HistoryContext';

export function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const { isHighContrastEnabled } = useAccessibility();
  const { scans } = useHistory();
  const hc = isHighContrastEnabled;

  const stats = useMemo(() => {
    const total = scans.length;
    const passed = scans.filter(s => s.verdict === 'PASS').length;
    const review = total - passed;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const byDenom = ['5', '10', '20', '50', '100'].map(d => ({
      denom: d, count: scans.filter(s => s.denomination === parseInt(d)).length,
    })).filter(d => d.count > 0);
    return { total, passed, review, passRate, byDenom };
  }, [scans]);

  const StatCard = ({ label, value, color, Icon }: any) => (
    <View style={[styles.statCard, hc && { borderColor: '#CCFF00', borderWidth: 2, backgroundColor: '#000' }]}>
      <Icon size={22} color={hc ? '#CCFF00' : color} />
      <Text style={[styles.statValue, { color: hc ? '#CCFF00' : color }]}>{value}</Text>
      <Text style={[styles.statLabel, hc && { color: '#fff' }]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={hc ? '#CCFF00' : Theme.colors.textMid} />
        </TouchableOpacity>
        <Text style={[styles.title, hc && { color: '#CCFF00' }]}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 48 }}>
        <View style={styles.grid}>
          <StatCard label="Total Scans" value={stats.total} color={Theme.colors.blue} Icon={BarChart3} />
          <StatCard label="Pass Rate" value={`${stats.passRate}%`} color={Theme.colors.green} Icon={TrendingUp} />
          <StatCard label="Passed" value={stats.passed} color={Theme.colors.green} Icon={ShieldCheck} />
          <StatCard label="For Review" value={stats.review} color={Theme.colors.amber} Icon={ShieldAlert} />
        </View>

        {stats.byDenom.length > 0 && (
          <View style={[styles.section, hc && { borderColor: '#CCFF00', borderWidth: 2, backgroundColor: '#000' }]}>
            <Text style={[styles.sectionTitle, hc && { color: '#CCFF00' }]}>By Denomination</Text>
            {stats.byDenom.map(({ denom, count }) => (
              <View key={denom} style={styles.denomRow}>
                <Text style={[styles.denomLabel, hc && { color: '#fff' }]}>${denom}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round((count / stats.total) * 100)}%`, backgroundColor: hc ? '#CCFF00' : Theme.colors.gold }]} />
                </View>
                <Text style={[styles.denomCount, hc && { color: '#CCFF00' }]}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {stats.total === 0 && (
          <View style={styles.empty}>
            <BarChart3 size={36} color={Theme.colors.textDim} />
            <Text style={styles.emptyText}>Scan some notes to see analytics</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: Theme.colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, padding: 16, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 11, color: Theme.colors.textDim, textTransform: 'uppercase', letterSpacing: 1 },
  section: { backgroundColor: Theme.colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Theme.colors.textMid, textTransform: 'uppercase', letterSpacing: 1 },
  denomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  denomLabel: { fontSize: 13, fontWeight: '700', color: Theme.colors.text, width: 36 },
  barTrack: { flex: 1, height: 8, backgroundColor: Theme.colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  denomCount: { fontSize: 12, color: Theme.colors.textDim, width: 24, textAlign: 'right' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Theme.colors.textDim, fontSize: 14 },
});


