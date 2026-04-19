/**
 * Performance Monitor
 *
 * Simple performance monitoring utility for tracking operation durations.
 * Use to identify slow operations during development and debugging.
 *
 * Usage:
 *   import { perf } from '@/lib/performance';
 *   perf.start('operation-name');
 *   // ... do work ...
 *   perf.end('operation-name'); // Logs duration with ⚡ (fast) or ⚠️ (slow) prefix
 *
 * Enable in production by setting localStorage.setItem('perf-monitor', 'true')
 */

export class PerformanceMonitor {
  private marks = new Map<string, number>();
  private enabled: boolean;

  constructor() {
    // Enable in development or when explicitly requested
    this.enabled =
      typeof window !== 'undefined' &&
      (process.env.NODE_ENV === 'development' || localStorage.getItem('perf-monitor') === 'true');
  }

  /**
   * Start timing an operation
   */
  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  /**
   * End timing and log result
   * @returns Duration in milliseconds, or 0 if label not found
   */
  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.marks.delete(label);

    if (this.enabled) {
      const prefix = duration < 50 ? '⚡' : '⚠️';
      console.log(`${prefix} ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export const perf = new PerformanceMonitor();
