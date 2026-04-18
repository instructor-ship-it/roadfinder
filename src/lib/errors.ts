/**
 * Centralized Error Handling Utilities
 *
 * This module provides standardized error handling across the application.
 * Use these utilities for consistent error responses and logging.
 */

import { ZodError } from 'zod';

// ─── Error Types ─────────────────────────────────────────────────────────────

/**
 * Standard application error codes
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

  // Application specific
  OFFLINE_ERROR = 'OFFLINE_ERROR',
  GPS_ERROR = 'GPS_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  LOCATION_NOT_FOUND = 'LOCATION_NOT_FOUND',
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Standard API success response structure
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
  fromCache?: boolean;
  cachedAt?: number;
}

/**
 * Combined API response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Custom Error Classes ────────────────────────────────────────────────────

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404, { resource, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * Offline error for network-related failures
 */
export class OfflineError extends AppError {
  constructor(operation: string) {
    super(`Cannot ${operation} while offline`, ErrorCode.OFFLINE_ERROR, 503, { operation });
    this.name = 'OfflineError';
  }
}

/**
 * Storage error for IndexedDB/localStorage failures
 */
export class StorageError extends AppError {
  constructor(operation: string, originalError?: Error) {
    super(`Storage operation failed: ${operation}`, ErrorCode.STORAGE_ERROR, 500, {
      operation,
      originalError: originalError?.message,
    });
    this.name = 'StorageError';
  }
}

/**
 * GPS/Location error
 */
export class GpsError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.GPS_ERROR, 500, details);
    this.name = 'GpsError';
  }
}

// ─── Error Handlers ──────────────────────────────────────────────────────────

/**
 * Create a standardized API error response
 */
export function createErrorResponse(error: Error | AppError, requestId?: string): ApiErrorResponse {
  const isAppError = error instanceof AppError;

  // Determine error code and status
  const code = isAppError ? error.code : ErrorCode.INTERNAL_ERROR;
  const statusCode = isAppError ? error.statusCode : 500;

  // Build response
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message: error.message || 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
  };

  // Add request ID if available
  if (requestId) {
    response.requestId = requestId;
  }

  // Add details for AppError
  if (isAppError && error.details) {
    response.error.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  // Log error
  logError(error, statusCode);

  return response;
}

/**
 * Create a standardized API success response
 */
export function createSuccessResponse<T>(
  data: T,
  options?: { fromCache?: boolean; cachedAt?: number }
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...options,
  };
}

/**
 * Handle Zod validation errors
 */
export function handleZodError(error: ZodError): ValidationError {
  const details: Record<string, string[]> = {};

  error.issues.forEach((err) => {
    const path = err.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(err.message);
  });

  return new ValidationError('Validation failed', details);
}

/**
 * Wrap an async handler with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>,
  context?: string
): Promise<ApiResponse<T>> {
  return handler()
    .then((data) => createSuccessResponse(data))
    .catch((error) => {
      if (error instanceof ZodError) {
        return createErrorResponse(handleZodError(error));
      }
      if (error instanceof AppError) {
        return createErrorResponse(error);
      }
      // Wrap unknown errors
      const wrappedError = new AppError(
        error.message || 'An unexpected error occurred',
        ErrorCode.INTERNAL_ERROR,
        500,
        { context, originalError: error.message }
      );
      return createErrorResponse(wrappedError);
    });
}

/**
 * Log error to console and potentially to external service
 */
function logError(error: Error, statusCode: number): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode,
  };

  // Console logging
  if (statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(logData, null, 2));
  } else {
    console.warn('[WARN]', error.message);
  }

  // In production, you could send to a logging service
  // e.g., Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    // sendToLoggingService(logData);
  }
}

// ─── Safe Execution Utilities ───────────────────────────────────────────────

/**
 * Safely execute a function and return a result or null
 */
export async function safeExecute<T>(fn: () => Promise<T>, fallback?: T): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error('[SafeExecute] Error:', error);
    return fallback ?? null;
  }
}

/**
 * Safely execute a synchronous function
 */
export function safeExecuteSync<T>(fn: () => T, fallback?: T): T | null {
  try {
    return fn();
  } catch (error) {
    console.error('[SafeExecuteSync] Error:', error);
    return fallback ?? null;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffFactor = 2 } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Check if a response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (isAppError(error)) {
    switch (error.code) {
      case ErrorCode.OFFLINE_ERROR:
        return "This feature requires an internet connection. Please try again when you're online.";
      case ErrorCode.GPS_ERROR:
        return "Unable to get your location. Please check your device's location settings.";
      case ErrorCode.STORAGE_ERROR:
        return 'Unable to save data. Your device may be low on storage.';
      case ErrorCode.NOT_FOUND:
        return 'The requested item could not be found.';
      case ErrorCode.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}
