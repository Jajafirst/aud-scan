export type RootStackParamList = {
  Main: undefined;
  Scan: undefined;
  Verdict: { status: 'PASS' | 'REVIEW'; result?: any; serialNumber?: string; denomination?: number; confidence?: number; pixelChecks?: { colorTone: boolean; clearWindow: boolean; dynamicMovement: boolean; dynamicImage3d: boolean; rollingColour: boolean; bumpPattern: boolean } };
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