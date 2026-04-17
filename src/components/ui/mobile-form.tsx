'use client';

import React, { forwardRef, useState, useId } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ValidationState {
  isValid: boolean | null;
  message?: string;
}

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  validation?: ValidationState;
  showValidationIcon?: boolean;
}

/**
 * Mobile-optimized input component with built-in validation feedback
 * Includes proper ARIA attributes for accessibility
 */
export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      validation,
      showValidationIcon = true,
      className,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    const hasError = error || validation?.isValid === false;
    const hasSuccess = success || validation?.isValid === true;

    // Combine describedBy IDs
    const describedBy =
      [ariaDescribedBy, hint && hintId, hasError && errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={hasError ? 'true' : undefined}
            className={cn(
              'w-full h-12 px-3 py-2 rounded-lg text-white text-base',
              'bg-gray-800 border transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Default state
              'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20',
              // Error state
              hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              // Success state
              hasSuccess &&
                !hasError &&
                'border-green-500 focus:border-green-500 focus:ring-green-500/20',
              // Disabled state
              props.disabled && 'opacity-50 cursor-not-allowed bg-gray-900',
              className
            )}
            {...props}
          />

          {/* Validation icon */}
          {showValidationIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError && <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />}
              {hasSuccess && !hasError && (
                <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
              )}
            </div>
          )}
        </div>

        {/* Hint text */}
        {hint && !hasError && (
          <p id={hintId} className="text-xs text-gray-500 flex items-center gap-1">
            <Info className="w-3 h-3" aria-hidden="true" />
            {hint}
          </p>
        )}

        {/* Error message */}
        {(error || validation?.message) && hasError && (
          <p id={errorId} role="alert" className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {error || validation?.message}
          </p>
        )}

        {/* Success message */}
        {success && hasSuccess && !hasError && (
          <p className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" aria-hidden="true" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';

interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

/**
 * Mobile-optimized select component with validation feedback
 */
export const MobileSelect = forwardRef<HTMLSelectElement, MobileSelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder = 'Select...',
      className,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;

    const hasError = !!error;

    const describedBy =
      [ariaDescribedBy, hint && hintId, hasError && errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          aria-describedby={describedBy}
          aria-invalid={hasError ? 'true' : undefined}
          className={cn(
            'w-full h-12 px-3 py-2 rounded-lg text-white text-base appearance-none',
            'bg-gray-800 border transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            "bg-[url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")]",
            'bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat',
            // Default state
            'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20',
            // Error state
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            // Disabled state
            props.disabled && 'opacity-50 cursor-not-allowed bg-gray-900',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Hint text */}
        {hint && !hasError && (
          <p id={hintId} className="text-xs text-gray-500">
            {hint}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

MobileSelect.displayName = 'MobileSelect';

// Validation helpers
export const validators = {
  required: (value: string, fieldName = 'This field'): ValidationState => ({
    isValid: value.trim() !== '',
    message: value.trim() === '' ? `${fieldName} is required` : undefined,
  }),

  slk: (value: string): ValidationState => {
    if (!value.trim()) {
      return { isValid: false, message: 'SLK is required' };
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      return { isValid: false, message: 'Enter a valid SLK (e.g., 12.345)' };
    }
    return { isValid: true };
  },

  slkRange: (start: string, end: string): ValidationState => {
    const startNum = parseFloat(start);
    const endNum = parseFloat(end);

    if (isNaN(startNum) || isNaN(endNum)) {
      return { isValid: false, message: 'Enter valid SLK values' };
    }
    if (startNum >= endNum) {
      return { isValid: false, message: 'Start SLK must be less than End SLK' };
    }
    return { isValid: true };
  },

  minLength: (value: string, min: number, fieldName = 'Value'): ValidationState => ({
    isValid: value.length >= min,
    message: value.length < min ? `${fieldName} must be at least ${min} characters` : undefined,
  }),

  url: (value: string): ValidationState => {
    if (!value.trim()) {
      return { isValid: true }; // Empty is valid (optional)
    }
    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return { isValid: false, message: 'Enter a valid URL' };
    }
  },
};

// Hook for form validation
export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  validateFn: (values: T) => Partial<Record<keyof T, ValidationState>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [validationStates, setValidationStates] = useState<
    Partial<Record<keyof T, ValidationState>>
  >({});

  const handleChange = (field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Validate on change if already touched
    if (touched[field]) {
      const newValidations = validateFn({ ...values, [field]: value });
      setValidationStates((prev) => ({
        ...prev,
        [field]: newValidations[field],
      }));
    }
  };

  const handleBlur = (field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newValidations = validateFn(values);
    setValidationStates((prev) => ({
      ...prev,
      [field]: newValidations[field],
    }));
  };

  const validateAll = (): boolean => {
    const allValidations = validateFn(values);
    setValidationStates(allValidations);
    // Mark all as touched
    const allTouched = Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);
    // Return true if all valid
    return Object.values(allValidations).every((v) => v?.isValid !== false);
  };

  const reset = () => {
    setValues(initialValues);
    setTouched({});
    setValidationStates({});
  };

  return {
    values,
    setValues,
    touched,
    validationStates,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    // Helper to get props for an input
    getInputProps: (field: keyof T) => ({
      value: values[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        handleChange(field, e.target.value),
      onBlur: () => handleBlur(field),
      validation: validationStates[field],
      error:
        touched[field] && validationStates[field]?.isValid === false
          ? validationStates[field]?.message
          : undefined,
    }),
  };
}
