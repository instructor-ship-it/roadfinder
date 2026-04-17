'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

interface MobileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  success?: string;
  hint?: string;
  rules?: ValidationRule[];
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  showValidationIcon?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

/**
 * Mobile-optimized input component with real-time validation
 * - Touch-friendly hit targets (44px minimum)
 * - Real-time validation feedback
 * - Character count display
 * - Accessible labels and error announcements
 */
export function MobileInput({
  label,
  value,
  onChange,
  error: externalError,
  success,
  hint,
  rules = [],
  validateOnBlur = true,
  validateOnChange = false,
  showValidationIcon = true,
  maxLength,
  showCharCount = false,
  className,
  id,
  disabled,
  required,
  ...props
}: MobileInputProps) {
  const [internalError, setInternalError] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const inputId =
    id ||
    `input-${label?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).substr(2, 9)}`;

  // Validate value against rules
  const validate = useCallback(
    (val: string): string => {
      if (required && !val.trim()) {
        return `${label || 'This field'} is required`;
      }

      for (const rule of rules) {
        if (!rule.validate(val)) {
          return rule.message;
        }
      }

      return '';
    },
    [rules, required, label]
  );

  // Validate on value change if enabled
  useEffect(() => {
    if (validateOnChange && touched) {
      setInternalError(validate(value));
    }
  }, [value, validate, validateOnChange, touched]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    if (validateOnBlur) {
      setInternalError(validate(value));
    }
  };

  const handleFocus = () => {
    // Clear error when user focuses to re-validate
    if (internalError) {
      setInternalError('');
    }
  };

  const displayError = externalError || internalError;
  const isValid = touched && !displayError && value.length > 0 && success;
  const charCount = value.length;
  const isNearLimit = maxLength && charCount >= maxLength * 0.9;

  return (
    <div className="space-y-1.5">
      {/* Label */}
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
          {label}
          {required && (
            <span className="text-red-400 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          aria-invalid={!!displayError}
          aria-describedby={
            displayError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'w-full px-4 py-3 rounded-lg text-white text-base',
            'bg-gray-800 border-2 transition-colors',
            'placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-900',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'touch-manipulation', // Prevents double-tap zoom
            displayError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : isValid
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
                : 'border-gray-600 focus:border-cyan-500 focus:ring-cyan-500/30',
            className
          )}
          {...props}
        />

        {/* Validation icon */}
        {showValidationIcon && touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {displayError && <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />}
            {isValid && <CheckCircle className="w-5 h-5 text-green-400" aria-hidden="true" />}
          </div>
        )}
      </div>

      {/* Hint text */}
      {hint && !displayError && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" aria-hidden="true" />
          {hint}
        </p>
      )}

      {/* Error message */}
      {displayError && (
        <p
          id={`${inputId}-error`}
          className="text-xs text-red-400 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {displayError}
        </p>
      )}

      {/* Success message */}
      {isValid && success && (
        <p className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" aria-hidden="true" />
          {success}
        </p>
      )}

      {/* Character count */}
      {showCharCount && maxLength && (
        <p className={cn('text-xs text-right', isNearLimit ? 'text-amber-400' : 'text-gray-500')}>
          {charCount}/{maxLength}
        </p>
      )}
    </div>
  );
}

// Common validation rules
export const commonRules = {
  required: (fieldName: string): ValidationRule => ({
    validate: (v) => v.trim().length > 0,
    message: `${fieldName} is required`,
  }),

  minLength: (min: number): ValidationRule => ({
    validate: (v) => v.length >= min,
    message: `Must be at least ${min} characters`,
  }),

  maxLength: (max: number): ValidationRule => ({
    validate: (v) => v.length <= max,
    message: `Must be no more than ${max} characters`,
  }),

  pattern: (pattern: RegExp, message: string): ValidationRule => ({
    validate: (v) => pattern.test(v),
    message,
  }),

  slk: (): ValidationRule => ({
    validate: (v) => {
      const num = parseFloat(v);
      return !isNaN(num) && num >= 0 && num <= 9999;
    },
    message: 'SLK must be a number between 0 and 9999',
  }),

  numeric: (): ValidationRule => ({
    validate: (v) => !isNaN(parseFloat(v)) || v === '',
    message: 'Must be a number',
  }),

  positiveNumber: (): ValidationRule => ({
    validate: (v) => {
      const num = parseFloat(v);
      return !isNaN(num) && num > 0;
    },
    message: 'Must be a positive number',
  }),
};
