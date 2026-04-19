import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  OfflineStatusIndicator,
  NetworkStatusBanner,
  DataFreshnessDisplay,
  useOnlineStatus,
  SyncStatusIndicator,
  DataSourceBadge,
  DataStatusPanel,
} from './OfflineStatusIndicator';

describe('OfflineStatusIndicator', () => {
  it('shows "No Cached Data" when dataUnavailable is true', () => {
    render(<OfflineStatusIndicator dataUnavailable={true} />);

    expect(screen.getByText('No Cached Data')).toBeInTheDocument();
  });

  it('shows "Live" when fromCache is false', () => {
    render(<OfflineStatusIndicator fromCache={false} />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows "Cached" with time when fromCache is true', () => {
    const cachedAt = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    render(<OfflineStatusIndicator fromCache={true} cachedAt={cachedAt} />);

    expect(screen.getByText(/Cached/)).toBeInTheDocument();
    expect(screen.getByText(/5m ago/)).toBeInTheDocument();
  });

  it('shows source in detailed mode', () => {
    const cachedAt = Date.now() - 5 * 60 * 1000;
    render(
      <OfflineStatusIndicator
        fromCache={true}
        cachedAt={cachedAt}
        source="Open-Meteo API"
        detailed={true}
      />
    );

    expect(screen.getByText(/\(Open-Meteo API\)/)).toBeInTheDocument();
  });

  it('shows amber warning for old cache (over 30 mins)', () => {
    const cachedAt = Date.now() - 45 * 60 * 1000; // 45 minutes ago
    const { container } = render(<OfflineStatusIndicator fromCache={true} cachedAt={cachedAt} />);

    // The amber class should be applied
    const indicator = container.querySelector('span');
    expect(indicator?.className).toContain('bg-amber');
  });

  it('shows blue for fresh cache (under 30 mins)', () => {
    const cachedAt = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    const { container } = render(<OfflineStatusIndicator fromCache={true} cachedAt={cachedAt} />);

    const indicator = container.querySelector('span');
    expect(indicator?.className).toContain('bg-blue');
  });

  it('applies custom className', () => {
    const { container } = render(
      <OfflineStatusIndicator fromCache={false} className="custom-class" />
    );

    // Check the className is on the root span element
    const indicator = container.querySelector('span');
    expect(indicator?.className).toContain('custom-class');
  });
});

describe('DataFreshnessDisplay', () => {
  it('shows "Unknown" when no timestamp provided', () => {
    render(<DataFreshnessDisplay />);

    // The component shows "Data: Unknown" with possible emoji prefix
    expect(screen.getByText(/Data: Unknown/)).toBeInTheDocument();
  });

  it('shows "Fresh" for data under 5 minutes old', () => {
    const timestamp = Date.now() - 2 * 60 * 1000; // 2 minutes ago
    render(<DataFreshnessDisplay timestamp={timestamp} />);

    // Match the text which includes emoji and label
    expect(screen.getByText(/Data: Fresh/)).toBeInTheDocument();
  });

  it('shows minutes for data under 1 hour old', () => {
    const timestamp = Date.now() - 15 * 60 * 1000; // 15 minutes ago
    render(<DataFreshnessDisplay timestamp={timestamp} />);

    expect(screen.getByText(/Data: 15m ago/)).toBeInTheDocument();
  });

  it('shows hours for data under 24 hours old', () => {
    const timestamp = Date.now() - 3 * 60 * 60 * 1000; // 3 hours ago
    render(<DataFreshnessDisplay timestamp={timestamp} />);

    expect(screen.getByText(/Data: 3h ago/)).toBeInTheDocument();
  });

  it('shows days for data over 24 hours old', () => {
    const timestamp = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    render(<DataFreshnessDisplay timestamp={timestamp} />);

    expect(screen.getByText(/Data: 2d ago/)).toBeInTheDocument();
  });

  it('uses custom label', () => {
    const timestamp = Date.now() - 3 * 60 * 1000;
    render(<DataFreshnessDisplay timestamp={timestamp} label="Weather" />);

    // The label is used with a colon, so we match "Weather:" followed by freshness
    expect(screen.getByText(/Weather: Fresh/)).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    const timestamp = Date.now() - 10 * 60 * 1000; // 10 mins (shows 🟢)
    render(<DataFreshnessDisplay timestamp={timestamp} showIcon={false} />);

    // When showIcon is false, no emoji should be present
    const text = screen.getByText(/Data: 10m ago/);
    expect(text.textContent).not.toContain('🟢');
  });

  it('shows green for fresh data (under 30 mins)', () => {
    const timestamp = Date.now() - 10 * 60 * 1000;
    render(<DataFreshnessDisplay timestamp={timestamp} />);

    const text = screen.getByText(/Data: 10m ago/);
    expect(text.className).toContain('text-green');
  });

  it('shows amber for older data (1-24 hours)', () => {
    const timestamp = Date.now() - 5 * 60 * 60 * 1000; // 5 hours
    render(<DataFreshnessDisplay timestamp={timestamp} />);

    const text = screen.getByText(/Data: 5h ago/);
    expect(text.className).toContain('text-amber');
  });

  it('shows red for stale data (over 24 hours)', () => {
    const timestamp = Date.now() - 30 * 60 * 60 * 1000; // 30 hours
    render(<DataFreshnessDisplay timestamp={timestamp} />);

    const text = screen.getByText(/Data: 1d ago/);
    expect(text.className).toContain('text-red');
  });
});

describe('useOnlineStatus', () => {
  it('returns initial online status', () => {
    // The hook uses navigator.onLine which defaults to true in jsdom
    const TestComponent = () => {
      const { isOnline } = useOnlineStatus();
      return <span>{isOnline ? 'Online' : 'Offline'}</span>;
    };

    render(<TestComponent />);

    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('responds to online/offline events', () => {
    const TestComponent = () => {
      const { isOnline } = useOnlineStatus();
      return <span data-testid="status">{isOnline ? 'Online' : 'Offline'}</span>;
    };

    render(<TestComponent />);

    // Initially online
    expect(screen.getByTestId('status').textContent).toBe('Online');

    // Simulate going offline
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByTestId('status').textContent).toBe('Offline');

    // Simulate coming back online
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByTestId('status').textContent).toBe('Online');
  });
});

describe('NetworkStatusBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show when online initially', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<NetworkStatusBanner />);

    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('shows offline message when offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<NetworkStatusBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it('shows "Back online" message when connection restored', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<NetworkStatusBanner />);

    // First go offline
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    // Then come back online
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByText(/Back online/)).toBeInTheDocument();
  });

  it('hides banner after 3 seconds when back online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<NetworkStatusBanner />);

    // Go offline then online
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });

    // Banner should be visible
    expect(screen.getByText(/Back online/)).toBeInTheDocument();

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Banner should be hidden
    expect(screen.queryByText(/Back online/)).not.toBeInTheDocument();
  });
});

describe('SyncStatusIndicator', () => {
  it('does not render when not syncing', () => {
    const { container } = render(<SyncStatusIndicator isSyncing={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders with default message when syncing', () => {
    render(<SyncStatusIndicator isSyncing={true} />);

    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<SyncStatusIndicator isSyncing={true} message="Downloading data" />);

    expect(screen.getByText('Downloading data')).toBeInTheDocument();
  });

  it('shows progress percentage', () => {
    render(<SyncStatusIndicator isSyncing={true} progress={75} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SyncStatusIndicator isSyncing={true} className="custom-sync" />);

    const indicator = container.querySelector('span');
    expect(indicator?.className).toContain('custom-sync');
  });
});

describe('DataSourceBadge', () => {
  it('returns null when no source provided', () => {
    const { container } = render(<DataSourceBadge />);

    expect(container.firstChild).toBeNull();
  });

  it('shows IndexedDB badge for IndexedDB source', () => {
    render(<DataSourceBadge source="Offline: IndexedDB cached data" />);

    expect(screen.getByText('IndexedDB')).toBeInTheDocument();
  });

  it('shows WA Health badge for WA Health source', () => {
    render(<DataSourceBadge source="Online: Hospital: WA Health SLIP" />);

    expect(screen.getByText('WA Health')).toBeInTheDocument();
  });

  it('shows FuelWatch badge for FuelWatch source', () => {
    render(<DataSourceBadge source="Online: Fuel: FuelWatch WA" />);

    expect(screen.getByText('FuelWatch')).toBeInTheDocument();
  });

  it('shows Open-Meteo badge for weather source', () => {
    render(<DataSourceBadge source="Online: Open-Meteo API" />);

    expect(screen.getByText('Open-Meteo')).toBeInTheDocument();
  });

  it('shows Offline badge for offline source', () => {
    render(<DataSourceBadge source="Offline: Cached data" />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows Live badge for online source', () => {
    render(<DataSourceBadge source="Online" />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('applies correct color for error source', () => {
    const { container } = render(<DataSourceBadge source="Error: Network error" />);

    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-red');
  });
});

describe('DataStatusPanel', () => {
  it('renders with data types', () => {
    const dataTypes = [
      { name: 'Weather', fromCache: true, cachedAt: Date.now() - 5 * 60 * 1000 },
      { name: 'Traffic', fromCache: false },
      { name: 'Amenities', dataUnavailable: true },
    ];

    render(<DataStatusPanel dataTypes={dataTypes} />);

    expect(screen.getByText('📊 Data Status')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByText('Traffic')).toBeInTheDocument();
    expect(screen.getByText('Amenities')).toBeInTheDocument();
  });

  it('shows "No data" for unavailable data', () => {
    const dataTypes = [{ name: 'Weather', dataUnavailable: true }];

    render(<DataStatusPanel dataTypes={dataTypes} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('shows "Live" for fresh data', () => {
    const dataTypes = [{ name: 'Traffic', fromCache: false }];

    render(<DataStatusPanel dataTypes={dataTypes} />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows "Cached" with age for cached data', () => {
    const dataTypes = [{ name: 'Weather', fromCache: true, cachedAt: Date.now() - 10 * 60 * 1000 }];

    render(<DataStatusPanel dataTypes={dataTypes} />);

    expect(screen.getByText(/Cached/)).toBeInTheDocument();
  });

  it('shows source badge when provided', () => {
    const dataTypes = [{ name: 'Weather', fromCache: true, source: 'Open-Meteo API' }];

    render(<DataStatusPanel dataTypes={dataTypes} />);

    expect(screen.getByText('Open-Meteo')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const dataTypes = [{ name: 'Test', fromCache: false }];
    const { container } = render(
      <DataStatusPanel dataTypes={dataTypes} className="custom-panel" />
    );

    const panel = container.querySelector('div');
    expect(panel?.className).toContain('custom-panel');
  });
});
