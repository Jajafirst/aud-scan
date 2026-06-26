import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Verdict = 'PASS' | 'REVIEW';

export interface ScanRecord {
  id: string;
  timestamp: string;
  denomination: number;
  verdict: Verdict;
  serialNumber?: string;
  staffId?: string;
  tillNumber?: string;
  image?: string;
  suburb?: string;
  features: {
    name: string;
    passed: boolean;
  }[];
}

interface HistoryContextType {
  scans: ScanRecord[];
  isBusinessAccount: boolean;
  addScan: (scan: Omit<ScanRecord, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  setBusinessAccount: (enabled: boolean) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [isBusinessAccount, setBusinessAccount] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const savedScans = localStorage.getItem('audscan_history');
    const savedBusiness = localStorage.getItem('audscan_business_mode');
    
    if (savedScans) {
      setScans(JSON.parse(savedScans));
    }
    if (savedBusiness) {
      setBusinessAccount(JSON.parse(savedBusiness));
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('audscan_history', JSON.stringify(scans));
  }, [scans]);

  useEffect(() => {
    localStorage.setItem('audscan_business_mode', JSON.stringify(isBusinessAccount));
  }, [isBusinessAccount]);

  const addScan = useCallback((scan: Omit<ScanRecord, 'id' | 'timestamp'>) => {
    const newScan: ScanRecord = {
      ...scan,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setScans(prev => [newScan, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setScans([]);
  }, []);

  return (
    <HistoryContext.Provider value={{ 
      scans, 
      isBusinessAccount, 
      addScan, 
      clearHistory, 
      setBusinessAccount 
    }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
