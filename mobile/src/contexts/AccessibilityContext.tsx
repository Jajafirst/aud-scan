import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

type HapticType = 'TICK' | 'DOUBLE_TICK' | 'MILESTONE' | 'FLIP' | 'PASS' | 'REVIEW' | 'SLOW_PULSE';

interface AccessibilityContextType {
  isHapticsEnabled: boolean;
  setHapticsEnabled: (v: boolean) => void;
  isHighContrastEnabled: boolean;
  setHighContrastEnabled: (v: boolean) => void;
  isAudioGuidanceEnabled: boolean;
  setAudioGuidanceEnabled: (v: boolean) => void;
  isLargeTextEnabled: boolean;
  setLargeTextEnabled: (v: boolean) => void;
  triggerHaptic: (type: HapticType) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({} as AccessibilityContextType);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [isHapticsEnabled, setHapticsEnabled] = useState(true);
  const [isHighContrastEnabled, setHighContrastEnabled] = useState(false);
  const [isAudioGuidanceEnabled, setAudioGuidanceEnabled] = useState(false);
  const [isLargeTextEnabled, setLargeTextEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const [haptics, contrast, audio, largeText] = await Promise.all([
        AsyncStorage.getItem('hapticsEnabled'),
        AsyncStorage.getItem('highContrastEnabled'),
        AsyncStorage.getItem('audioGuidanceEnabled'),
        AsyncStorage.getItem('largeTextEnabled'),
      ]);
      if (haptics !== null) setHapticsEnabled(haptics === 'true');
      if (contrast !== null) setHighContrastEnabled(contrast === 'true');
      if (audio !== null) setAudioGuidanceEnabled(audio === 'true');
      if (largeText !== null) setLargeTextEnabled(largeText === 'true');
    })();
  }, []);

  const persist = async (key: string, value: boolean) => {
    await AsyncStorage.setItem(key, String(value));
  };

  const triggerHaptic = (type: HapticType) => {
    if (!isHapticsEnabled) return;
    switch (type) {
      case 'TICK': Haptics.selectionAsync(); break;
      case 'DOUBLE_TICK': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'MILESTONE': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case 'PASS': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'REVIEW': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
      case 'FLIP':
      case 'SLOW_PULSE': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      isHapticsEnabled,
      setHapticsEnabled: (v) => { setHapticsEnabled(v); persist('hapticsEnabled', v); },
      isHighContrastEnabled,
      setHighContrastEnabled: (v) => { setHighContrastEnabled(v); persist('highContrastEnabled', v); },
      isAudioGuidanceEnabled,
      setAudioGuidanceEnabled: (v) => { setAudioGuidanceEnabled(v); persist('audioGuidanceEnabled', v); },
      isLargeTextEnabled,
      setLargeTextEnabled: (v) => { setLargeTextEnabled(v); persist('largeTextEnabled', v); },
      triggerHaptic,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);