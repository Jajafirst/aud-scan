export type RootStackParamList = {
  Main: undefined;
  Scan: undefined;
  Verdict: { status: 'PASS' | 'REVIEW'; result?: any; serialNumber?: string };
  SecurityGuide: undefined;
  ScanHistory: { selectedId?: string } | undefined;
  Analytics: undefined;
  Privacy: undefined;
  AccessibilitySettings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Alerts: undefined;
  Settings: undefined;
};
