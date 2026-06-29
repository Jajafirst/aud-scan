import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccessibilityProvider } from './src/contexts/AccessibilityContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { HistoryProvider } from './src/contexts/HistoryContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AccessibilityProvider>
          <AlertProvider>
            <HistoryProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </HistoryProvider>
          </AlertProvider>
        </AccessibilityProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}