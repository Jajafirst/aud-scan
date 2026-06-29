import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Camera, Bell, Settings } from 'lucide-react-native';
import { Theme } from '../Theme';
import type { RootStackParamList, TabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { AlertFeedScreen } from '../screens/AlertFeedScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { VerdictScreen } from '../screens/VerdictScreen';
import { SecurityGuide } from '../screens/SecurityGuide';
import { ScanHistory } from '../screens/ScanHistory';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { PrivacyCenter } from '../screens/PrivacyCenter';
import { AccessibilitySettings } from '../screens/AccessibilitySettings';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Theme.colors.surface, borderTopColor: Theme.colors.border, borderTopWidth: 1, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: Theme.colors.gold,
        tabBarInactiveTintColor: Theme.colors.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Camera size={22} color={color} /> }} />
      <Tab.Screen name="Alerts" component={AlertFeedScreen} options={{ tabBarIcon: ({ color }) => <Bell size={22} color={color} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Scan" component={CameraScreen} />
      <Stack.Screen name="Verdict" component={VerdictScreen} />
      <Stack.Screen name="SecurityGuide" component={SecurityGuide} />
      <Stack.Screen name="ScanHistory" component={ScanHistory} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyCenter} />
      <Stack.Screen name="AccessibilitySettings" component={AccessibilitySettings} />
    </Stack.Navigator>
  );
}
