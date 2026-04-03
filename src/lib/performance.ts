export class PerformanceMonitor {
  private marks = new Map();
  start(label) { this.marks.set(label, performance.now()); }
  end(label) {
    const start = this.marks.get(label);
    if (!start) return 0;
    const duration = performance.now() - start;
    console.log(`${duration < 50 ? '✅' : '🐌'} ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}
export const perf = new PerformanceMonitor();
