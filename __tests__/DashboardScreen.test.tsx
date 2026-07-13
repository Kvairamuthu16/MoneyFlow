import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AppDataProvider } from '../src/context/AppDataContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import DashboardScreen from '../src/features/dashboard/DashboardScreen';
import { initializeStorage } from '../src/storage/mmkv';

function renderDashboard() {
  return render(
    <AppDataProvider>
      <ThemeProvider>
        <DashboardScreen navigation={{ navigate: jest.fn() }} />
      </ThemeProvider>
    </AppDataProvider>
  );
}

describe('DashboardScreen', () => {
  beforeEach(async () => {
    await initializeStorage();
  });

  it('renders the hero balance card and headline on first launch', () => {
    renderDashboard();

    expect(screen.getByText('Active Financial Hub')).toBeTruthy();
    expect(screen.getByText('Durable Cash Balance')).toBeTruthy();
  });

  it('shows an empty state prompting the user to scan their SMS inbox when there are no transactions', () => {
    renderDashboard();

    expect(screen.getByText('No SMS Transactions for this month')).toBeTruthy();
    expect(screen.getByText('Tap to scan your SMS inbox')).toBeTruthy();
  });
});
