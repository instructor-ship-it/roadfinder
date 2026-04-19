# Testing Guide

This document provides a comprehensive guide to testing the TC Work Zone Locator application. The project uses Vitest as its testing framework, along with Testing Library for React component testing.

## Table of Contents

- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Test File Organization](#test-file-organization)
- [Writing Unit Tests](#writing-unit-tests)
- [Writing Component Tests](#writing-component-tests)
- [Testing Hooks](#testing-hooks)
- [Test Coverage](#test-coverage)
- [Playwright E2E Testing](#playwright-e2e-testing)
- [Best Practices](#best-practices)
- [Common Testing Patterns](#common-testing-patterns)
- [Debugging Tests](#debugging-tests)

---

## Testing Stack

The project uses the following testing tools:

| Tool                                                                                    | Purpose                           | Version |
| --------------------------------------------------------------------------------------- | --------------------------------- | ------- |
| [Vitest](https://vitest.dev/)                                                           | Test runner and assertion library | 4.x     |
| [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) | React component testing           | 16.x    |
| [@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/)       | Custom DOM matchers               | 6.x     |
| [@vitest/coverage-v8](https://vitest.dev/guide/coverage.html)                           | Code coverage reports             | 4.x     |
| [jsdom](https://github.com/jsdom/jsdom)                                                 | DOM simulation environment        | 29.x    |

### Configuration

The testing configuration is defined in `vitest.config.ts`. The setup includes:

- **Environment**: jsdom for DOM simulation
- **Plugin**: `@vitejs/plugin-react` for JSX/TSX transformation
- **Globals**: Built-in Vitest globals (describe, it, expect, etc.)
- **Setup Files**: `./src/test/setup.ts` (Testing Library jest-dom matchers)
- **Coverage**: v8 coverage provider with text, JSON, and HTML reports

---

## Running Tests

### Basic Commands

```bash
# Run all tests once
bun run test

# Run tests in watch mode (reruns on file changes)
bun run test:watch

# Run tests with coverage report
bun run test:coverage
```

### Running Specific Tests

```bash
# Run tests in a specific file
bunx vitest run src/lib/utils.test.ts

# Run tests matching a pattern
bunx vitest run --reporter=verbose "gps"

# Run a specific test by name
bunx vitest run -t "should calculate distance correctly"
```

### CI/CD Integration

In CI environments, tests run automatically via GitHub Actions. The workflow:

1. Installs dependencies
2. Runs `bun run test` (exits with error if any test fails)
3. Runs `bun run typecheck` for TypeScript validation
4. Runs `bun run lint` for code quality checks

---

## Test File Organization

Test files follow a co-location pattern, placed alongside the source files they test:

```
src/
├── lib/
│   ├── utils.ts              # Source file
│   ├── utils.test.ts         # Test file
│   ├── validation.ts
│   ├── validation.test.ts
│   ├── max-hold-time.ts
│   ├── max-hold-time.test.ts
│   ├── errors.ts
│   ├── errors.test.ts
│   ├── offline-db.ts
│   └── offline-db.test.ts
├── hooks/
│   ├── useGpsTracking.ts
│   └── useGpsTracking.test.ts
└── components/
    ├── ui/
    │   ├── badge.tsx
    │   ├── badge.test.tsx
    │   ├── button.tsx
    │   └── button.test.tsx
    └── home/
        ├── OfflineStatusIndicator.tsx
        └── OfflineStatusIndicator.test.tsx
```

### Naming Conventions

| File Type        | Convention              | Example                   |
| ---------------- | ----------------------- | ------------------------- |
| Unit test        | `*.test.ts`             | `utils.test.ts`           |
| Component test   | `*.test.tsx`            | `Button.test.tsx`         |
| Integration test | `*.integration.test.ts` | `api.integration.test.ts` |

---

## Writing Unit Tests

Unit tests focus on isolated functions and modules. They should be fast, deterministic, and test a single responsibility.

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateDistance, formatSlk } from './utils';

describe('Utils Module', () => {
  describe('calculateDistance', () => {
    it('should return 0 for identical coordinates', () => {
      const result = calculateDistance(0, 0, 0, 0);
      expect(result).toBe(0);
    });

    it('should calculate positive distance for different coordinates', () => {
      const result = calculateDistance(0, 0, 1, 1);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle negative coordinates', () => {
      const result = calculateDistance(-10, -10, 10, 10);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('formatSlk', () => {
    it('should format SLK with correct decimal places', () => {
      expect(formatSlk(12.345)).toBe('12.345');
    });

    it('should handle zero values', () => {
      expect(formatSlk(0)).toBe('0.000');
    });
  });
});
```

### Testing Error Conditions

Always test error cases and edge conditions:

```typescript
describe('parseWorkZoneData', () => {
  it('should throw error for invalid JSON', () => {
    expect(() => parseWorkZoneData('not json')).toThrow();
  });

  it('should return empty array for null input', () => {
    expect(parseWorkZoneData(null)).toEqual([]);
  });

  it('should handle malformed work zone objects', () => {
    const malformed = [{ road: 'M0001' }]; // Missing required fields
    const result = parseWorkZoneData(JSON.stringify(malformed));
    expect(result).toEqual([]);
  });
});
```

### Using Test Fixtures

For complex test data, use fixtures:

```typescript
// fixtures/workZones.ts
export const mockWorkZone = {
  road: 'M0001',
  roadName: 'Great Eastern Highway',
  region: 'METRO',
  startSlk: 10.5,
  endSlk: 15.2,
  speedLimit: 60,
  direction: 'Both',
};

export const mockWorkZones = [
  mockWorkZone,
  { ...mockWorkZone, road: 'H001', roadName: 'Albany Highway' },
];

// In test file
import { mockWorkZone, mockWorkZones } from '../fixtures/workZones';

describe('WorkZone processing', () => {
  it('should process single work zone', () => {
    const result = processWorkZone(mockWorkZone);
    expect(result.roadName).toBe('Great Eastern Highway');
  });
});
```

---

## Writing Component Tests

Component tests verify UI behavior and user interactions using Testing Library's user-centric approach.

### Basic Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge } from './badge';

describe('Badge Component', () => {
  it('should render with text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should apply variant styles correctly', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Badge onClick={handleClick}>Clickable</Badge>);
    await user.click(screen.getByText('Clickable'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Forms

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SlkInputForm } from './SlkInputForm';

describe('SlkInputForm', () => {
  it('should submit valid SLK values', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<SlkInputForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/start slk/i), '10.5');
    await user.type(screen.getByLabelText(/end slk/i), '15.2');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        startSlk: 10.5,
        endSlk: 15.2
      });
    });
  });

  it('should show validation errors for invalid input', async () => {
    const user = userEvent.setup();
    render(<SlkInputForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/start slk/i), 'abc');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/invalid slk/i)).toBeInTheDocument();
  });
});
```

### Testing Async Components

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkZoneResults } from './WorkZoneResults';

// Mock the API call
vi.mock('@/lib/api', () => ({
  fetchWorkZones: vi.fn()
}));

describe('WorkZoneResults', () => {
  it('should show loading state initially', () => {
    render(<WorkZoneResults road="M0001" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display results after loading', async () => {
    const mockZones = [{ road: 'M0001', speedLimit: 60 }];
    vi.mocked(fetchWorkZones).mockResolvedValue(mockZones);

    render(<WorkZoneResults road="M0001" />);

    await waitFor(() => {
      expect(screen.getByText('60 km/h')).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(fetchWorkZones).mockRejectedValue(new Error('API Error'));

    render(<WorkZoneResults road="M0001" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

## Testing Hooks

Custom hooks can be tested using the `renderHook` function from Testing Library.

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGpsTracking } from './useGpsTracking';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

vi.stubGlobal('navigator', {
  geolocation: mockGeolocation,
});

describe('useGpsTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useGpsTracking());

    expect(result.current.position).toBeNull();
    expect(result.current.isTracking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should start tracking when called', () => {
    const { result } = renderHook(() => useGpsTracking());

    act(() => {
      result.current.startTracking();
    });

    expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    expect(result.current.isTracking).toBe(true);
  });

  it('should update position on geolocation update', () => {
    const mockPosition = {
      coords: { latitude: -31.95, longitude: 115.86, accuracy: 10 },
    };

    mockGeolocation.watchPosition.mockImplementation((callback) => {
      callback(mockPosition);
      return 1;
    });

    const { result } = renderHook(() => useGpsTracking());

    act(() => {
      result.current.startTracking();
    });

    expect(result.current.position).toEqual({
      lat: -31.95,
      lng: 115.86,
      accuracy: 10,
    });
  });

  it('should stop tracking and clear watch', () => {
    mockGeolocation.watchPosition.mockReturnValue(123);

    const { result } = renderHook(() => useGpsTracking());

    act(() => {
      result.current.startTracking();
      result.current.stopTracking();
    });

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(123);
    expect(result.current.isTracking).toBe(false);
  });
});
```

---

## Test Coverage

### Generating Coverage Reports

```bash
# Generate coverage report
bun run test:coverage

# Output locations:
# - Terminal: Summary printed to stdout
# - HTML Report: coverage/index.html
# - JSON Report: coverage/coverage-final.json
```

### Coverage Thresholds

The project aims for the following coverage targets:

| Metric     | Target | Description                       |
| ---------- | ------ | --------------------------------- |
| Lines      | 70%    | Percentage of code lines executed |
| Functions  | 70%    | Percentage of functions called    |
| Branches   | 60%    | Percentage of branches taken      |
| Statements | 70%    | Percentage of statements executed |

### Viewing Coverage Reports

1. Run `bun run test:coverage`
2. Open `coverage/index.html` in a browser
3. Navigate through directories to see:
   - Green: Covered code
   - Red: Uncovered code
   - Yellow: Partially covered branches

### Excluding Files from Coverage

Files that don't need coverage testing:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/',
        'src/test/', // Test utilities and helpers
        '**/*.d.ts', // Type declaration files
        '**/*.config.*', // Configuration files
        '**/types/**', // Type definition directories
      ],
    },
  },
});
```

Note: The coverage targets listed above are aspirational goals, not enforced thresholds. The actual `vitest.config.ts` does not define `thresholds` properties.

---

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad: Testing implementation details
expect(component.state.count).toBe(5);

// ✅ Good: Testing visible behavior
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it('works', () => {});

// ✅ Good
it('should display error message when SLK value is negative', () => {});
```

### 3. Keep Tests Isolated

```typescript
describe('LocalStorage Manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save data to localStorage', () => {
    // Fresh localStorage for each test
  });
});
```

### 4. Avoid Testing Library Details

```typescript
// ❌ Bad: Testing React internals
expect(component.find('Button').prop('disabled')).toBe(true);

// ✅ Good: Testing user-facing state
expect(screen.getByRole('button')).toBeDisabled();
```

### 5. Use Query Priorities

Testing Library recommends this priority for queries:

1. `getByRole` - Best for accessibility
2. `getByLabelText` - Good for form fields
3. `getByPlaceholderText` - For inputs
4. `getByText` - For non-interactive elements
5. `getByTestId` - Last resort

```typescript
// ✅ Preferred
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email address/i);

// ⚠️ Acceptable but not preferred
screen.getByText('Welcome');
screen.getByPlaceholderText('Enter email');

// ❌ Avoid when possible
screen.getByTestId('submit-button');
```

---

## Common Testing Patterns

### Mocking Modules

```typescript
// Mock external dependencies
vi.mock('@/lib/config', () => ({
  config: {
    apiUrl: 'https://test-api.example.com',
  },
}));

// Mock with partial implementation
vi.mock('@/lib/api', () => ({
  fetchWorkZones: vi.fn(),
  fetchSpeedLimits: vi.fn(),
}));
```

### Mocking Timers

```typescript
import { vi, beforeEach, afterEach, it, expect } from 'vitest';

describe('Timer functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call callback after delay', () => {
    const callback = vi.fn();
    setTimeout(callback, 1000);

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalled();
  });
});
```

### Testing IndexedDB

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDB, deleteDB } from 'idb';

describe('Offline Database', () => {
  const dbName = 'test-offline-db';

  beforeEach(async () => {
    await deleteDB(dbName);
  });

  it('should store and retrieve work zones', async () => {
    const db = await openDB(dbName, 1, {
      upgrade(db) {
        db.createObjectStore('workZones');
      },
    });

    await db.put('workZones', { road: 'M0001' }, 'M0001');
    const result = await db.get('workZones', 'M0001');

    expect(result).toEqual({ road: 'M0001' });
  });
});
```

---

## Debugging Tests

### Using screen.debug()

```typescript
import { screen } from '@testing-library/react';

it('should render correctly', () => {
  render(<MyComponent />);

  // Print the entire DOM
  screen.debug();

  // Print specific element
  screen.debug(screen.getByRole('form'));
});
```

### Using Testing Playground

When tests fail, copy the HTML output into [Testing Playground](https://testing-playground.com/) to find better queries.

### Running Tests in Verbose Mode

```bash
bunx vitest run --reporter=verbose
```

### Debugging Single Test

```bash
# Run specific test file in watch mode
bunx vitest watch src/lib/utils.test.ts
```

---

## Playwright E2E Testing

The project uses [Playwright](https://playwright.dev/) for end-to-end testing of critical user workflows in a real browser environment.

### Setup

Playwright is configured as a devDependency (`@playwright/test ^1.59.1`). Configuration is in `playwright.config.ts` at the project root.

### Running E2E Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run specific E2E test file
bunx playwright test e2e/work-zone-lookup.spec.ts

# Run with UI mode for debugging
bunx playwright test --ui
```

### E2E Test Files

| Test File                      | Tests                        |
| ------------------------------ | ---------------------------- |
| `e2e/gps-lookup.spec.ts`       | GPS location lookup workflow |
| `e2e/offline-mode.spec.ts`     | Offline data availability    |
| `e2e/saved-locations.spec.ts`  | Saved locations CRUD         |
| `e2e/work-zone-lookup.spec.ts` | Work zone search and results |

### Key Differences from Unit Tests

| Aspect      | Unit Tests (Vitest)             | E2E Tests (Playwright)          |
| ----------- | ------------------------------- | ------------------------------- |
| Environment | jsdom (simulated)               | Real browser                    |
| Speed       | Fast (< 5s total)               | Slower (browser startup)        |
| Scope       | Individual functions/components | Full user workflows             |
| Network     | Mocked                          | Real (or mocked at route level) |

---

## Continuous Integration

Tests are automatically run in GitHub Actions for:

- Every push to `main` branch
- Every pull request

The CI pipeline ensures:

1. All tests pass
2. TypeScript compiles without errors
3. Linting passes
4. Build succeeds

Failed tests will block merging of pull requests.

---

## Getting Help

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
