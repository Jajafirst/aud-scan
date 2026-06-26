import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2, CheckCircle2, ShieldAlert, Clock } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useHistory } from '../contexts/HistoryContext';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'ScanHistory'>;

export function ScanHistory() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { isHighContrastEnabled } = useAccessibility();
  const { scans, clearHistory } = useHistory();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'PASS' | 'REVIEW'>('all');
  const [expanded, setExpanded] = useState<string | null>(route.params?.selectedId ?? null);
  const hc = isHighContrastEnabled;

  const filtered = useMemo(() =>
    scans.filter(s => {
      const matchSearch = !search || s.serialNumber?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || s.verdict === filter;
      return matchSearch && matchFilter;
    }), [scans, search, filter]);

  const handleClear = () => {
    Alert.alert('Clear History', 'Delete all scan history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={hc ? '#CCFF00' : Theme.colors.textMid} />
        </TouchableOpacity>
        <Text style={[styles.title, hc && { color: '#CCFF00' }]}>Scan History</Text>
        <TouchableOpacity onPress={handleClear}>
          <Trash2 size={20} color={hc ? '#CCFF00' : Theme.colors.red} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.search, hc && { color: '#fff', borderColor: '#CCFF00', backgroundColor: '#000' }]}
        placeholder="Search serial number…"
        placeholderTextColor={hc ? '#888' : Theme.colors.textDim}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        {(['all', 'PASS', 'REVIEW'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && { backgroundColor: hc ? '#CCFF00' : Theme.colors.gold }]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && { color: hc ? '#000' : Theme.colors.background }]}>
              {f === 'all' ? 'All' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Clock size={32} color={Theme.colors.textDim} />
            <Text style={styles.emptyText}>No scans found</Text>
          </View>
        ) : filtered.map(scan => {
          const isOpen = expanded === scan.id;
          return (
            <TouchableOpacity key={scan.id} style={[styles.card, hc && { borderColor: '#CCFF00', borderWidth: 2, backgroundColor: '#000' }]} onPress={() => setExpanded(isOpen ? null : scan.id)}>
              <View style={styles.cardRow}>
                <View style={[styles.denomBadge, hc && { borderColor: '#CCFF00' }]}>
                  <Text style={[styles.denomText, hc && { color: '#CCFF00' }]}>${scan.denomination}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verdictText, { color: scan.verdict === 'PASS' ? Theme.colors.green : Theme.colors.amber }, hc && { color: '#CCFF00' }]}>{scan.verdict}</Text>
                  <Text style={[styles.timeText, hc && { color: '#aaa' }]}>{formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}</Text>
                </View>
                {scan.verdict === 'PASS'
                  ? <CheckCircle2 size={20} color={hc ? '#CCFF00' : Theme.colors.green} />
                  : <ShieldAlert size={20} color={hc ? '#CCFF00' : Theme.colors.amber} />}
              </View>
              {isOpen && (
                <View style={[styles.detail, hc && { borderColor: '#CCFF00' }]}>
                  {scan.serialNumber ? <Text style={[styles.detailText, hc && { color: '#fff' }]}>Serial: {scan.serialNumber}</Text> : null}
                  <Text style={[styles.detailText, hc && { color: '#fff' }]}>Date: {new Date(scan.timestamp).toLocaleString('en-AU')}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 12, gap: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: '#fff' },
  search: { marginHorizontal: 20, marginBottom: 12, height: 44, backgroundColor: Theme.colors.surface2, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border, paddingHorizontal: 14, color: Theme.colors.text, fontSize: 14 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Theme.colors.surface2, borderWidth: 1, borderColor: Theme.colors.border },
  filterText: { fontSize: 12, fontWeight: '700', color: Theme.colors.textDim },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Theme.colors.textDim, fontSize: 14 },
  card: { backgroundColor: Theme.colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  denomBadge: { width: 40, height: 40, backgroundColor: Theme.colors.background, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  denomText: { fontWeight: '900', fontSize: 12, color: Theme.colors.textMid },
  verdictText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  timeText: { fontSize: 11, color: Theme.colors.textDim, marginTop: 1 },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: Theme.colors.border, gap: 4 },
  detailText: { fontSize: 12, color: Theme.colors.textMid, fontFamily: 'monospace' },
});
