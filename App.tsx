import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react-native';

import { AppDataProvider } from './src/context/AppDataContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppGate } from './src/features/lock/AppGate';
import DashboardScreen from './src/features/dashboard/DashboardScreen';
import TransactionsScreen from './src/features/transactions/TransactionsScreen';
import BudgetsScreen from './src/features/budgets/BudgetsScreen';
import AnalyticsScreen from './src/features/analytics/AnalyticsScreen';
import SettingsScreen from './src/features/settings/SettingsScreen';

export type RootTabParamList = {
  Dashboard: undefined;
  Transactions: { accountFilter?: string } | undefined;
  Budgets: undefined;
  Analytics: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function AppNavigator() {
  const theme = useTheme();

  return (
    <>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.accent,
            tabBarInactiveTintColor: theme.colors.textMuted,
            tabBarStyle: { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border },
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Transactions"
            component={TransactionsScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Budgets"
            component={BudgetsScreen}
            options={{
              tabBarIcon: ({ color, size }) => <PiggyBank color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppGate>
          <AppDataProvider>
            <ThemeProvider>
              <AppNavigator />
            </ThemeProvider>
          </AppDataProvider>
        </AppGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
