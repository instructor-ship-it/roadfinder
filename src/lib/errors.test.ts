/**
 * Tests for centralized error handling utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  OfflineError,
  StorageError,
  GpsError,
  ErrorCode,
  createErrorResponse,
  createSuccessResponse,
  isAppError,
  isErrorResponse,
  isSuccessResponse,
  getUserMessage,
  safeExecute,
  safeExecuteSync,
  withRetry,
} from './errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('creates an error with correct properties', () => {
      const error = new AppError('Test error', ErrorCode.INTERNAL_ERROR, 500);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('includes details when provided', () => {
      const details = { field: 'test', value: 123 };
      const error = new AppError('Test error', ErrorCode.BAD_REQUEST, 400, details);
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('creates a validation error', () => {
      const error = new ValidationError('Invalid input', { field: 'name' });
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'name' });
    });
  });

  describe('NotFoundError', () => {
    it('creates a not found error with identifier', () => {
      const error = new NotFoundError('Road', 'H001');
      expect(error.message).toBe('Road not found: H001');
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });

    it('creates a not found error without identifier', () => {
      const error = new NotFoundError('Location');
      expect(error.message).toBe('Location not found');
    });
  });

  describe('OfflineError', () => {
    it('creates an offline error', () => {
      const error = new OfflineError('fetch data');
      expect(error.message).toBe('Cannot fetch data while offline');
      expect(error.code).toBe(ErrorCode.OFFLINE_ERROR);
      expect(error.statusCode).toBe(503);
    });
  });

  describe('StorageError', () => {
    it('creates a storage error', () => {
      const originalError = new Error('Quota exceeded');
      const error = new StorageError('save location', originalError);
      expect(error.code).toBe(ErrorCode.STORAGE_ERROR);
      expect(error.details?.operation).toBe('save location');
    });
  });

  describe('GpsError', () => {
    it('creates a GPS error', () => {
      const error = new GpsError('GPS signal lost');
      expect(error.code).toBe(ErrorCode.GPS_ERROR);
    });
  });
});

describe('Response Creators', () => {
  describe('createErrorResponse', () => {
    it('creates an error response from AppError', () => {
      const error = new ValidationError('Invalid input');
      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.error.message).toBe('Invalid input');
      expect(response.timestamp).toBeDefined();
    });

    it('creates an error response from generic Error', () => {
      const error = new Error('Unknown error');
      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it('includes request ID when provided', () => {
      const error = new AppError('Test');
      const response = createErrorResponse(error, 'req-123');
      expect(response.requestId).toBe('req-123');
    });
  });

  describe('createSuccessResponse', () => {
    it('creates a success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    it('includes cache metadata when provided', () => {
      const data = { id: 1 };
      const cachedAt = Date.now();
      const response = createSuccessResponse(data, { fromCache: true, cachedAt });

      expect(response.fromCache).toBe(true);
      expect(response.cachedAt).toBe(cachedAt);
    });
  });
});

describe('Type Guards', () => {
  describe('isAppError', () => {
    it('returns true for AppError instances', () => {
      const error = new AppError('Test');
      expect(isAppError(error)).toBe(true);
    });

    it('returns false for generic errors', () => {
      const error = new Error('Test');
      expect(isAppError(error)).toBe(false);
    });
  });

  describe('isErrorResponse', () => {
    it('returns true for error responses', () => {
      const response = createErrorResponse(new Error('Test'));
      expect(isErrorResponse(response)).toBe(true);
    });

    it('returns false for success responses', () => {
      const response = createSuccessResponse({ data: 'test' });
      expect(isErrorResponse(response)).toBe(false);
    });
  });

  describe('isSuccessResponse', () => {
    it('returns true for success responses', () => {
      const response = createSuccessResponse({ data: 'test' });
      expect(isSuccessResponse(response)).toBe(true);
    });
  });
});

describe('getUserMessage', () => {
  it('returns user-friendly message for offline error', () => {
    const error = new OfflineError('fetch');
    const message = getUserMessage(error);
    expect(message).toContain('internet connection');
  });

  it('returns user-friendly message for GPS error', () => {
    const error = new GpsError('GPS failed');
    const message = getUserMessage(error);
    expect(message).toContain('location');
  });

  it('returns user-friendly message for storage error', () => {
    const error = new StorageError('save');
    const message = getUserMessage(error);
    expect(message).toContain('storage');
  });

  it('returns original message for generic AppError', () => {
    const error = new AppError('Custom message', ErrorCode.INTERNAL_ERROR);
    const message = getUserMessage(error);
    expect(message).toBe('Custom message');
  });

  it('handles generic errors', () => {
    const error = new Error('Generic error');
    const message = getUserMessage(error);
    expect(message).toBe('Generic error');
  });
});

describe('Safe Execution', () => {
  describe('safeExecute', () => {
    it('returns result on success', async () => {
      const result = await safeExecute(() => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it('returns null on error', async () => {
      const result = await safeExecute(() => Promise.reject(new Error('Failed')));
      expect(result).toBeNull();
    });

    it('returns fallback on error', async () => {
      const result = await safeExecute(() => Promise.reject(new Error('Failed')), 'fallback');
      expect(result).toBe('fallback');
    });
  });

  describe('safeExecuteSync', () => {
    it('returns result on success', () => {
      const result = safeExecuteSync(() => 42);
      expect(result).toBe(42);
    });

    it('returns null on error', () => {
      const result = safeExecuteSync(() => {
        throw new Error('Failed');
      });
      expect(result).toBeNull();
    });
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn, { initialDelay: 100 });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

    // Create the promise and catch rejections to avoid unhandled rejection warnings
    const resultPromise = withRetry(fn, { maxRetries: 2, initialDelay: 100 }).catch((e) => {
      // Expected to reject
      return e;
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Always fails');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});
