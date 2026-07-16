import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TransactionsListScreen from './TransactionsScreen';
import TransactionDetailScreen from './TransactionDetailScreen';

export type TransactionsStackParamList = {
  TransactionsList: { accountFilter?: string } | undefined;
  TransactionDetail: { transactionId: string };
};

const Stack = createStackNavigator<TransactionsStackParamList>();

// headerShown: false throughout -- every screen in this app renders its own
// SafeAreaView + custom top bar rather than using React Navigation's native
// header, and TransactionDetailScreen follows the same pattern with its own
// back button.
export default function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsList" component={TransactionsListScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
    </Stack.Navigator>
  );
}
