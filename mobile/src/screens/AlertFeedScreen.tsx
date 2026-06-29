import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, AlertTriangle, MapPin, ExternalLink } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAlerts, AustralianState } from '../contexts/AlertContext';

const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export function AlertFeedScreen() {
  const { isHighContrastEnabled } = useAccessibility();
  const { alerts, homeState, setHomeState, unreadCount, markAsRead } = useAlerts();
  const hc = isHighContrastEnabled;

  useEffect(() => { markAsRead(); }, []);

  const filtered = homeState ? alerts.filter(a => a.state === homeState) : alerts;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Bell size={20} color={hc ? '#CCFF00' : Theme.colors.gold} />
          <Text style={[styles.title, hc && { color: '#CCFF00' }]}>Counterfeit Alerts</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount} new</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        <TouchableOpacity
          style={[styles.stateChip, !homeState && styles.stateChipActive, hc && !homeState && { backgroundColor: '#CCFF00' }]}
          onPress={() => setHomeState(null as any)}
        >
          <Text style={[styles.stateChipText, !homeState && styles.stateChipTextActive, hc && !homeState && { color: '#000' }]}>All</Text>
        </TouchableOpacity>
        {STATES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.stateChip, homeState === s && styles.stateChipActive, hc && homeState === s && { backgroundColor: '#CCFF00' }]}
            onPress={() => setHomeState(s)}
          >
            <Text style={[styles.stateChipText, homeState === s && styles.stateChipTextActive, hc && homeState === s && { color: '#000' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Bell size={36} color={Theme.colors.textDim} />
            <Text style={styles.emptyText}>No alerts for {homeState}</Text>
          </View>
        ) : (
          filtered.map(alert => (
            <View key={alert.id} style={[styles.card, hc && { backgroundColor: '#000', borderColor: '#CCFF00', borderWidth: 2 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.severityBadge, { backgroundColor: alert.severity === 'High' ? 'rgba(240,90,90,0.15)' : 'rgba(240,160,48,0.15)' }]}>
                  <Text style={[styles.severityText, { color: alert.severity === 'High' ? Theme.colors.red : Theme.colors.amber }]}>
                    {alert.severity}
                  </Text>
                </View>
                <View style={styles.statePill}>
                  <MapPin size={10} color={hc ? '#CCFF00' : Theme.colors.textDim} />
                  <Text style={[styles.stateText, hc && { color: '#CCFF00' }]}>{alert.state}</Text>
                </View>
                <Text style={styles.timeText}>
                  {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                </Text>
              </View>
              <Text style={[styles.alertTitle, hc && { color: '#fff' }]}>{alert.title}</Text>
              <Text style={[styles.alertDesc, hc && { color: '#ddd' }]}>{alert.description}</Text>
              {alert.policeTip && (
                <View style={[styles.tipBox, hc && { borderColor: '#CCFF00' }]}>
                  <Text style={[styles.tipLabel, hc && { color: '#CCFF00' }]}>Police Tip</Text>
                  <Text style={[styles.tipText, hc && { color: '#fff' }]}>{alert.policeTip}</Text>
                </View>
              )}
              {alert.mediaReleaseUrl && (
                <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(alert.mediaReleaseUrl!)}>
                  <ExternalLink size={12} color={hc ? '#CCFF00' : Theme.colors.blue} />
                  <Text style={[styles.linkText, { color: hc ? '#CCFF00' : Theme.colors.blue }]}>View Media Release</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.sourceText}>Source: {alert.source}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  unreadBadge: { backgroundColor: Theme.colors.red, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  stateRow: { flexShrink: 0, marginBottom: 4 },
  stateChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.surface2 },
  stateChipActive: { backgroundColor: Theme.colors.gold, borderColor: Theme.colors.gold },
  stateChipText: { fontSize: 11, fontWeight: '700', color: Theme.colors.textDim },
  stateChipTextActive: { color: Theme.colors.background },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Theme.colors.textDim, fontSize: 14 },
  card: { backgroundColor: Theme.colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stateText: { fontSize: 11, color: Theme.colors.textDim, fontWeight: '700' },
  timeText: { marginLeft: 'auto', fontSize: 10, color: Theme.colors.textDim },
  alertTitle: { fontSize: 14, fontWeight: '700', color: Theme.colors.text, lineHeight: 20 },
  alertDesc: { fontSize: 13, color: Theme.colors.textMid, lineHeight: 19 },
  tipBox: { backgroundColor: 'rgba(212,168,67,0.08)', borderLeftWidth: 3, borderColor: Theme.colors.gold, paddingLeft: 10, paddingVertical: 8, borderRadius: 4 },
  tipLabel: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, color: Theme.colors.goldText, marginBottom: 2 },
  tipText: { fontSize: 12, color: Theme.colors.textMid, lineHeight: 17 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText: { fontSize: 12, fontWeight: '600' },
  sourceText: { fontSize: 9, color: Theme.colors.textDim },
});
