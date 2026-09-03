import './global.css';

import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppProvider, useApp } from './context/AppContext';
import { DashboardScreen } from './screens/DashboardScreen';
import { CoachScreen } from './screens/CoachScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ScoreDetailScreen } from './screens/ScoreDetailScreen';
import { useTheme } from './lib/theme';
import type { RootStackParamList, TabParamList } from './navigation/types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<
  keyof TabParamList,
  { active: React.ComponentProps<typeof Ionicons>['name']; inactive: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  Dashboard: { active: 'speedometer', inactive: 'speedometer-outline' },
  Coach: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Plan: { active: 'checkbox', inactive: 'checkbox-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

function Tabs() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.inkFaint,
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor: t.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive}
            size={size - 2}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const t = useTheme();
  const { hydrated } = useApp();

  const navTheme = useMemo<NavTheme>(() => {
    const base = t.name === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.primary,
        background: t.canvas,
        card: t.surface,
        text: t.ink,
        border: t.border,
        notification: t.primary,
      },
    };
  }, [t]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.canvas,
        }}
      >
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={t.name === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="ScoreDetail"
          component={ScoreDetailScreen}
          options={{
            presentation: 'modal',
            animation: Platform.OS === 'ios' ? 'slide_from_bottom' : 'fade',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F1F5F9' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Root />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
