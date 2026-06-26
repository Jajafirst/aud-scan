import React, { createContext, useContext, useState, useEffect } from 'react';

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
  {
    id: '2026-vic-01',
    state: 'VIC',
    severity: 'High',
    title: 'Mitchell Shire: "PROPS" Notes Detected',
    timestamp: '2026-02-15T09:00:00Z',
    description: 'Counterfeit $50 and $100 notes circulating in Mitchell Shire. These notes are printed on paper and feature "PROPS" text.',
    mediaReleaseUrl: 'https://www.police.vic.gov.au/news',
    policeTip: 'Check for "PROPS" or "SPECIMEN" text near windows.',
    source: 'Victoria Police Media Release'
  },
  {
    id: '2026-wa-01',
    state: 'WA',
    severity: 'High',
    title: 'Albany Retail Alert: Fake $50s',
    timestamp: '2026-02-20T14:30:00Z',
    description: 'Fast-food outlets in Albany reporting high-quality counterfeit $50 notes. Verify the clear window features.',
    mediaReleaseUrl: 'https://www.police.wa.gov.au/news',
    policeTip: 'Feel the note for polymer texture; counterfeits often feel like thick paper.',
    source: 'Western Australia Police News'
  },
  {
    id: '2026-sa-01',
    state: 'SA',
    severity: 'High',
    title: 'Clovelly Park: Major Seizure',
    timestamp: '2026-04-05T11:15:00Z',
    description: 'Police seized a large quantity of counterfeit $50 notes and printing equipment in Clovelly Park.',
    mediaReleaseUrl: 'https://www.police.sa.gov.au/news',
    policeTip: 'Look for inconsistent serial numbers and poor microprint clarity.',
    source: 'South Australia Police Media'
  },
  {
    id: '1',
    state: 'NSW',
    severity: 'Med',
    title: 'Surry Hills: Suspicious $50s',
    timestamp: '2026-04-08T10:00:00Z',
    description: 'Reports of suspicious $50 notes in local cafes. Check the rolling color effect on the bird.',
    mediaReleaseUrl: 'https://www.police.nsw.gov.au/news',
    policeTip: 'Verify the bird moves its wings when tilted.',
    source: 'NSW Police Media Release'
  }
];

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [homeState, setHomeState] = useState<AustralianState | null>(() => {
    return (localStorage.getItem('homeState') as AustralianState) || null;
  });

  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => {
    return parseInt(localStorage.getItem('lastReadAlerts') || '0');
  });

  useEffect(() => {
    if (homeState) {
      localStorage.setItem('homeState', homeState);
    }
  }, [homeState]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const filteredAlerts = alerts.filter(alert => !homeState || alert.state === homeState);
  
  const unreadCount = alerts.filter(alert => new Date(alert.timestamp).getTime() > lastReadTimestamp).length;

  const markAsRead = () => {
    const now = Date.now();
    setLastReadTimestamp(now);
    localStorage.setItem('lastReadAlerts', now.toString());
  };

  const sendMockAlert = () => {
    const mockAlert: Alert = {
      id: Date.now().toString(),
      state: homeState || 'NSW',
      severity: 'High',
      title: `URGENT: New ${homeState || 'NSW'} Alert`,
      timestamp: new Date().toISOString(),
      description: 'A new cluster of high-severity counterfeits has been detected in your area. Immediate vigilance required.',
      mediaReleaseUrl: 'https://www.police.nsw.gov.au/news',
      source: 'AUDScan Forensic Team Advisory'
    };

    // Simulate push notification using Web Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(mockAlert.title, {
        body: mockAlert.description,
      });
    } else {
      console.log('Push Notification (Simulated):', mockAlert.title);
    }

    setAlerts(prev => [mockAlert, ...prev]);
  };

  return (
    <AlertContext.Provider value={{ homeState, setHomeState, alerts, filteredAlerts, unreadCount, markAsRead, sendMockAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlerts must be used within an AlertProvider');
  return context;
};
