/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomeScreen } from './screens/HomeScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PrivacyCenter } from './screens/PrivacyCenter';
import { SecurityGuide } from './screens/SecurityGuide';
import { AccessibilitySettings } from './screens/AccessibilitySettings';
import { OnboardingStack } from './components/OnboardingStack';
import { SplashScreen } from './components/SplashScreen';
import { CameraScreen } from './screens/CameraScreen';
import { VerdictScreen } from './screens/VerdictScreen';
import { useLocation } from 'react-router-dom';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AlertProvider } from './contexts/AlertContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { AlertFeedScreen } from './screens/AlertFeedScreen';
import { ScanHistory } from './screens/ScanHistory';
import { AnalyticsScreen } from './screens/AnalyticsScreen';

function VerdictWrapper() {
  const location = useLocation();
  const state = location.state as { 
    status?: 'PASS' | 'REVIEW', 
    result?: any, 
    serialNumber?: string 
  };
  const status = state?.status || 'REVIEW';
  return (
    <VerdictScreen 
      status={status} 
      result={state?.result} 
      serialNumber={state?.serialNumber} 
    />
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const onboardingCompleteStatus = localStorage.getItem('hasCompletedOnboarding') || localStorage.getItem('onboardingComplete');
    setShowOnboarding(onboardingCompleteStatus !== 'true');
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    localStorage.setItem('onboardingComplete', 'true');
    setShowOnboarding(false);
  };

  if (showSplash) {
    return (
      <AccessibilityProvider>
        <SplashScreen onAnimationComplete={() => setShowSplash(false)} />
      </AccessibilityProvider>
    );
  }

  if (showOnboarding === null) return null;

  return (
    <AccessibilityProvider>
      <AlertProvider>
        <HistoryProvider>
          <BrowserRouter>
            {showOnboarding && <OnboardingStack onComplete={handleOnboardingComplete} />}
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomeScreen />} />
                <Route path="scan" element={<CameraScreen />} />
                <Route path="alerts" element={<AlertFeedScreen />} />
                <Route path="verdict" element={<VerdictWrapper />} />
                <Route path="guide" element={<SecurityGuide />} />
                <Route path="settings" element={<SettingsScreen />} />
                <Route path="settings/accessibility" element={<AccessibilitySettings />} />
                <Route path="settings/privacy" element={<PrivacyCenter />} />
                <Route path="settings/analytics" element={<AnalyticsScreen />} />
                <Route path="settings/notifications" element={<PlaceholderScreen name="Notifications" />} />
                <Route path="settings/history" element={<ScanHistory />} />
                <Route path="settings/about" element={<PlaceholderScreen name="App Info" />} />
                <Route path="analytics" element={<AnalyticsScreen />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </HistoryProvider>
      </AlertProvider>
    </AccessibilityProvider>
  );
}
