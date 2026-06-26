import React, { createContext, useContext, useState, useEffect } from 'react';

type HapticType = 'PASS' | 'REVIEW' | 'TICK' | 'MILESTONE' | 'DOUBLE_TICK' | 'SLOW_PULSE' | 'FLIP';

interface AccessibilityContextType {
  isHapticsEnabled: boolean;
  isHighContrastEnabled: boolean;
  isAudioGuidanceEnabled: boolean;
  isLargeTextEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  setHighContrastEnabled: (enabled: boolean) => void;
  setAudioGuidanceEnabled: (enabled: boolean) => void;
  setLargeTextEnabled: (enabled: boolean) => void;
  triggerHaptic: (type: HapticType) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [isHapticsEnabled, setHapticsEnabled] = useState(true);
  const [isHighContrastEnabled, setHighContrastEnabled] = useState(false);
  const [isAudioGuidanceEnabled, setAudioGuidanceEnabled] = useState(false);
  const [isLargeTextEnabled, setLargeTextEnabled] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setHapticsEnabled(parsed.isHapticsEnabled ?? true);
      setHighContrastEnabled(parsed.isHighContrastEnabled ?? false);
      setAudioGuidanceEnabled(parsed.isAudioGuidanceEnabled ?? false);
      setLargeTextEnabled(parsed.isLargeTextEnabled ?? false);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility_settings', JSON.stringify({
      isHapticsEnabled,
      isHighContrastEnabled,
      isAudioGuidanceEnabled,
      isLargeTextEnabled,
    }));
  }, [isHapticsEnabled, isHighContrastEnabled, isAudioGuidanceEnabled, isLargeTextEnabled]);

  const triggerHaptic = (type: HapticType) => {
    if (!isHapticsEnabled || !navigator.vibrate) return;

    switch (type) {
      case 'PASS':
        // 3 heavy impacts
        navigator.vibrate([100, 50, 100, 50, 100]);
        break;
      case 'REVIEW':
        // 1 long error vibration
        navigator.vibrate(500);
        break;
      case 'TICK':
        // Light selection tick
        navigator.vibrate(10);
        break;
      case 'MILESTONE':
        // Double tick for milestones
        navigator.vibrate([15, 30, 15]);
        break;
      case 'DOUBLE_TICK':
        // Strong double tick for series lock-in
        navigator.vibrate([30, 40, 30]);
        break;
      case 'SLOW_PULSE':
        // Slow pulse for orientation correction
        navigator.vibrate([100, 400]);
        break;
      case 'FLIP':
        // Distinct pattern for note flip instruction
        navigator.vibrate([50, 100, 50, 100, 200]);
        break;
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      isHapticsEnabled,
      isHighContrastEnabled,
      isAudioGuidanceEnabled,
      isLargeTextEnabled,
      setHapticsEnabled,
      setHighContrastEnabled,
      setAudioGuidanceEnabled,
      setLargeTextEnabled,
      triggerHaptic,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
