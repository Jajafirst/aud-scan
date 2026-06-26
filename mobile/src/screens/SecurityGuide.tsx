
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../Theme';
import { useAccessibility } from '../contexts/AccessibilityContext';

const FEATURES: Record<string, { title: string; description: string; icon: string }[]> = {
  '5': [
    { title: 'Transparent Window', description: 'Full-length clear window with Federation Star and waratah flower.', icon: '🔍' },
    { title: 'Rolling Colour Effect', description: 'Blue and gold colours shift as you tilt the note.', icon: '🌈' },
    { title: 'Microprint', description: '"AUSTRALIA" printed in tiny text along the window borders.', icon: '🔬' },
  ],
  '10': [
    { title: 'Transparent Window', description: 'Clear window features lyrebird and stylised feather.', icon: '🔍' },
    { title: 'Colour-Shifting Ink', description: 'Numeral "10" shifts from gold to green when tilted.', icon: '🌈' },
    { title: 'Raised Print', description: 'Tactile intaglio print on "10" and "TEN DOLLARS".', icon: '✋' },
  ],
  '20': [
    { title: 'Clear Window', description: 'Transparent window with John Flynn portrait and flying doctor plane.', icon: '🔍' },
    { title: 'Holographic Strip', description: 'Multicolour holographic strip across the front.', icon: '✨' },
    { title: 'Microprint', description: '"AUSTRALIA" in fine print around window edges.', icon: '🔬' },
  ],
  '50': [
    { title: 'Top-to-Bottom Window', description: 'Full-length clear window with rolling colour patch.', icon: '🔍' },
    { title: 'Spinebill Motion', description: 'Eastern spinebill appears to move its wings when tilted.', icon: '🦅' },
    { title: 'Serial Number', description: 'Two serial numbers in different sizes; numbers must match.', icon: '🔢' },
    { title: 'Raised Print', description: 'Rough tactile feel on "50" and "FIFTY DOLLARS".', icon: '✋' },
  ],
  '100': [
    { title: 'Clear Window', description: 'Full-length window with lyrebird and feather, Southern Cross stars.', icon: '🔍' },
    { title: 'Colour-Shifting Numeral', description: '"100" shifts colour from gold to green when tilted.', icon: '🌈' },
    { title: 'Microprint', description: '"AUSTRALIA" repeated in fine print border.', icon: '🔬' },
    { title: 'Raised Print', description: 'Tactile intaglio on "100" and "ONE HUNDRED DOLLARS".', icon: '✋' },
  ],
};

const DENOMS = ['5', '10', '20', '50', '100'];

export function SecurityGuide() {
  const navigation = useNavigation<any>();
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const hc = isHighContrastEnabled;

  const filtered = useMemo(() => {
    if (!search) return DENOMS;
    return DENOMS.filter(d =>
      `$${d}`.includes(search) ||
      FEATURES[d].some(f => f.title.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: hc ? '#000' : Theme.colors.background }]}>
      <View style={[styles.header, hc && { borderColor: '#CCFF00' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, hc && { borderColor: '#CCFF00', borderWidth: 2 }]}>
          <ArrowLeft size={20} color={hc ? '#CCFF00' : Theme.colors.textMid} />
        </TouchableOpacity>
        <Text style={[styles.title, hc && { color: '#CCFF00' }, isLargeTextEnabled && { fontSize: 28 }]}>Security Guide</Text>
      </View>

      <View style={[styles.searchBox, hc && { borderColor: '#CCFF00', backgroundColor: '#000' }]}>
        <Search size={16} color={hc ? '#CCFF00' : Theme.colors.textDim} />
        <TextInput
          style={[styles.searchInput, hc && { color: '#fff' }]}
          placeholder="Search denomination or feature…"
          placeholderTextColor={hc ? '#888' : Theme.colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
        {filtered.map(denom => {
          const isOpen = expanded === denom;
          return (
            <View key={denom} style={[styles.card, hc && { borderColor: '#CCFF00', borderWidth: 2, backgroundColor: '#000' }]}>
              <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(isOpen ? null : denom)}>
                <View style={[styles.denomCircle, hc && { borderColor: '#CCFF00', borderWidth: 2 }]}>
                  <Text style={[styles.denomText, hc && { color: '#CCFF00' }]}>${denom}</Text>
                </View>
                <Text style={[styles.cardTitle, hc && { color: '#fff' }]}>${denom} Banknote</Text>
                <Text style={[styles.featureCount, hc && { color: '#CCFF00' }]}>{FEATURES[denom].length} features</Text>
                {isOpen ? <ChevronUp size={18} color={hc ? '#CCFF00' : Theme.colors.textDim} /> : <ChevronDown size={18} color={hc ? '#CCFF00' : Theme.colors.textDim} />}
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.featureList}>
                  {FEATURES[denom].map((f, i) => (
                    <View key={i} style={[styles.featureRow, hc && { borderColor: '#CCFF00' }]}>
                      <Text style={styles.featureIcon}>{f.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.featureTitle, hc && { color: '#CCFF00' }]}>{f.title}</Text>
                        <Text style={[styles.featureDesc, hc && { color: '#ddd' }]}>{f.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 12, gap: 12, borderBottomWidth: 1, borderColor: Theme.colors.border },
  backBtn: { padding: 8, backgroundColor: Theme.colors.surface2, borderRadius: 999, borderWidth: 1, borderColor: Theme.colors.border },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 20, marginBottom: 0, backgroundColor: Theme.colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: 44, color: Theme.colors.text, fontSize: 14 },
  card: { backgroundColor: Theme.colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  denomCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  denomText: { fontWeight: '900', fontSize: 13, color: Theme.colors.gold },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  featureCount: { fontSize: 10, color: Theme.colors.textDim, fontWeight: '700' },
  featureList: { borderTopWidth: 1, borderColor: Theme.colors.border, padding: 14, gap: 12 },
  featureRow: { flexDirection: 'row', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: Theme.colors.border },
  featureIcon: { fontSize: 22, width: 28 },
  featureTitle: { fontSize: 13, fontWeight: '700', color: Theme.colors.text, marginBottom: 2 },
  featureDesc: { fontSize: 12, color: Theme.colors.textMid, lineHeight: 17 },
});
