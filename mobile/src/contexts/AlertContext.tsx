import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface Alert {
  id: string;
  state: AustralianState;
  severity: 'High' | 'Med';
  title: string;
  timestamp: string;
  description: string;
  mediaReleaseUrl?: string;
  policeTip?: string;
  source: string;
}

interface AlertContextType {
  homeState: AustralianState | null;
  setHomeState: (state: AustralianState) => void;
  alerts: Alert[];
  filteredAlerts: Alert[];
  unreadCount: number;
  markAsRead: () => void;
  sendMockAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const MOCK_ALERTS: Alert[] = [
  { id: '2026-vic-01', state: 'VIC', severity: 'High', title: 'Mitchell Shire: "PROPS" Notes Detected', timestamp: '2026-02-15T09:00:00Z', description: 'Counterfeit $50 and $100 notes circulating in Mitchell Shire.', policeTip: 'Check for "PROPS" or "SPECIMEN" text near windows.', source: 'Victoria Police Media Release' },
  { id: '2026-wa-01', state: 'WA', severity: 'High', title: 'Albany Retail Alert: Fake $50s', timestamp: '2026-02-20T14:30:00Z', description: 'Fast-food outlets in Albany reporting high-quality counterfeit $50 notes.', policeTip: 'Feel the note for polymer texture.', source: 'Western Australia Police News' },
  { id: '2026-sa-01', state: 'SA', severity: 'High', title: 'Clovelly Park: Major Seizure', timestamp: '2026-04-05T11:15:00Z', description: 'Police seized a large quantity of counterfeit $50 notes in Clovelly Park.', source: 'South Australia Police Media' },
  { id: '1', state: 'NSW', severity: 'Med', title: 'Surry Hills: Suspicious $50s', timestamp: '2026-04-08T10:00:00Z', description: 'Reports of suspicious $50 notes in local cafes.', policeTip: 'Verify the bird moves its wings when tilted.', source: 'NSW Police Media Release' },
];

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [homeState, setHomeStateRaw] = useState<AustralianState | null>(null);
  const [alerts] = useState<Alert[]>(MOCK_ALERTS);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(0);

  useEffect(() => {
    (async () => {
      const state = await AsyncStorage.getItem('homeState');
      if (state) setHomeStateRaw(state as AustralianState);
      const lastRead = await AsyncStorage.getItem('lastReadAlerts');
      if (lastRead) setLastReadTimestamp(parseInt(lastRead));
    })();
  }, []);

  const setHomeState = async (state: AustralianState) => {
    setHomeStateRaw(state);
    await AsyncStorage.setItem('homeState', state);
  };

  const filteredAlerts = alerts.filter(a => !homeState || a.state === homeState);
  const unreadCount = alerts.filter(a => new Date(a.timestamp).getTime() > lastReadTimestamp).length;

  const markAsRead = async () => {
    const now = Date.now();
    setLastReadTimestamp(now);
    await AsyncStorage.setItem('lastReadAlerts', now.toString());
  };

  return (
    <AlertContext.Provider value={{ homeState, setHomeState, alerts, filteredAlerts, unreadCount, markAsRead, sendMockAlert: () => {} }}>
      {children}
    </AlertContext.Provider>
  );
}

export const useAlerts = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider');
  return ctx;
};
