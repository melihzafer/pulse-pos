import { render, screen, act } from '@testing-library/react';
import { ConnectionStatus } from './ConnectionStatus';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock core-logic
const mockGetSyncStatus = vi.fn();
vi.mock('@pulse/core-logic', () => ({
  syncService: {
    getSyncStatus: () => mockGetSyncStatus(),
  },
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSyncStatus.mockResolvedValue({
      isOnline: true,
      isSyncing: false,
      lastSync: new Date().toISOString(),
    });
  });

  it('renders online status by default', async () => {
    await act(async () => {
        render(<ConnectionStatus />);
    });
    
    // We expect "Online" text
    expect(screen.getByText('Online')).toBeDefined();
  });

  it('renders offline status when isOnline is false', async () => {
    mockGetSyncStatus.mockResolvedValue({
      isOnline: false,
      isSyncing: false,
      lastSync: null,
    });

    await act(async () => {
        render(<ConnectionStatus />);
    });
    
    expect(screen.getByText('Offline')).toBeDefined();
  });

  it('renders syncing status', async () => {
    mockGetSyncStatus.mockResolvedValue({
      isOnline: true,
      isSyncing: true,
      lastSync: null,
    });

    await act(async () => {
        render(<ConnectionStatus />);
    });
    
    expect(screen.getByText('Syncing...')).toBeDefined();
  });
});
