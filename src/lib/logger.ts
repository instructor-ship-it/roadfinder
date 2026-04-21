/**
 * Centralized Logging Utility
 *
 * Provides structured logging with environment-aware output.
 * Debug messages are only logged in development mode.
 *
 * @module lib/logger
 * @version 1.35.0
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Include timestamp in output */
  includeTimestamp: boolean;
  /** Include module name in output */
  includeModule: boolean;
  /** Log to console */
  consoleOutput: boolean;
  /** Custom log handler */
  customHandler?: (entry: LogEntry) => void;
}

// ─── Default Configuration ─────────────────────────────────────────────────

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'debug',
  includeTimestamp: true,
  includeModule: true,
  consoleOutput: true,
};

// ─── Log Level Priority ────────────────────────────────────────────────────

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ─── Logger Class ──────────────────────────────────────────────────────────

/**
 * Logger class for structured logging
 */
class Logger {
  private module: string;
  private config: LoggerConfig;

  constructor(module: string, config: Partial<LoggerConfig> = {}) {
    this.module = module;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Format a log entry
   */
  private formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      data,
    };
  }

  /**
   * Output a log entry
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // Call custom handler if provided
    if (this.config.customHandler) {
      this.config.customHandler(entry);
    }

    // Console output
    if (this.config.consoleOutput) {
      const prefix = this.config.includeTimestamp ? `[${entry.timestamp}]` : '';
      const moduleName = this.config.includeModule ? `[${entry.module}]` : '';

      const formattedMessage = `${prefix}${moduleName} ${entry.message}`;

      switch (entry.level) {
        case 'debug':
          if (process.env.NODE_ENV === 'development') {
            console.log(formattedMessage, entry.data || '');
          }
          break;
        case 'info':
          console.info(formattedMessage, entry.data || '');
          break;
        case 'warn':
          console.warn(formattedMessage, entry.data || '');
          break;
        case 'error':
          console.error(formattedMessage, entry.data || '');
          break;
      }
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('debug', message, data);
    this.output(entry);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('info', message, data);
    this.output(entry);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('warn', message, data);
    this.output(entry);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { error };

    const entry = this.formatEntry('error', message, { ...errorData, ...data });
    this.output(entry);
  }

  /**
   * Log a performance timing
   */
  time(label: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.time(`[${this.module}] ${label}`);
    }
  }

  /**
   * End a performance timing
   */
  timeEnd(label: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(`[${this.module}] ${label}`);
    }
  }

  /**
   * Create a child logger with a nested module name
   */
  child(submodule: string): Logger {
    return new Logger(`${this.module}:${submodule}`, this.config);
  }

  /**
   * Update logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ─── Logger Registry ───────────────────────────────────────────────────────

const loggers = new Map<string, Logger>();

/**
 * Get or create a logger for a module
 *
 * @param module - Module name (e.g., 'offline-db', 'gps-tracking')
 * @param config - Optional logger configuration
 * @returns Logger instance
 *
 * @example
 * const logger = getLogger('my-module');
 * logger.info('Operation started');
 * logger.error('Operation failed', new Error('Something went wrong'));
 */
export function getLogger(module: string, config?: Partial<LoggerConfig>): Logger {
  if (!loggers.has(module)) {
    loggers.set(module, new Logger(module, config));
  }
  return loggers.get(module)!;
}

/**
 * Create a new logger (always creates a new instance)
 */
export function createLogger(module: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(module, config);
}

// ─── Default Export ───────────────────────────────────────────────────────

/**
 * Default logger instance for general use
 */
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => getLogger('app').debug(message, data),
  info: (message: string, data?: Record<string, unknown>) => getLogger('app').info(message, data),
  warn: (message: string, data?: Record<string, unknown>) => getLogger('app').warn(message, data),
  error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) =>
    getLogger('app').error(message, error, data),
  time: (label: string) => getLogger('app').time(label),
  timeEnd: (label: string) => getLogger('app').timeEnd(label),
};

// ─── Module-Specific Loggers ───────────────────────────────────────────────

/**
 * Pre-configured loggers for common modules
 */
export const loggers_map = {
  offlineDb: () => getLogger('offline-db'),
  gps: () => getLogger('gps-tracking'),
  api: () => getLogger('api'),
  weather: () => getLogger('weather'),
  traffic: () => getLogger('traffic'),
  amenities: () => getLogger('amenities'),
  sw: () => getLogger('service-worker'),
};

export default logger;
