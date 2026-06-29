import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScanRecord {
  id: string;
  denomination: number;
  verdict: 'PASS' | 'REVIEW';
  timestamp: string;
  serialNumber?: string;
  suburb?: string;
  image?: string;
  checks?: { label: string; passed: boolean }[];
}

interface HistoryContextType {
  scans: ScanRecord[];
  addScan: (scan: ScanRecord) => void;
  clearHistory: () => void;
  isBusinessAccount: boolean;
  setBusinessAccount: (v: boolean) => void;
}

const HistoryContext = createContext<HistoryContextType>({} as HistoryContextType);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [isBusinessAccount, setBusinessAccount] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('scanHistory');
      if (raw) setScans(JSON.parse(raw));
      const biz = await AsyncStorage.getItem('isBusinessAccount');
      if (biz) setBusinessAccount(biz === 'true');
    })();
  }, []);

  const addScan = async (scan: ScanRecord) => {
    const updated = [scan, ...scans];
    setScans(updated);
    await AsyncStorage.setItem('scanHistory', JSON.stringify(updated));
  };

  const clearHistory = async () => {
    setScans([]);
    await AsyncStorage.removeItem('scanHistory');
  };

  return (
    <HistoryContext.Provider value={{
      scans, addScan, clearHistory, isBusinessAccount,
      setBusinessAccount: async (v) => {
        setBusinessAccount(v);
        await AsyncStorage.setItem('isBusinessAccount', String(v));
      },
    }}>
      {children}
    </HistoryContext.Provider>
  );
}

export const useHistory = () => useContext(HistoryContext);
