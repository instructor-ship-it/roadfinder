'use client';

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If true, input is masked (for passwords, keys, etc.) */
  secret?: boolean;
  /** If true, show a multi-line textarea instead of a single-line input */
  multiline?: boolean;
}

interface PromptContextValue {
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const PromptContext = createContext<PromptContextValue | null>(null);

/**
 * Hook to show a custom prompt dialog (replaces native `prompt()`).
 * Returns a promise that resolves to the entered string, or null if cancelled.
 *
 * Usage:
 *   const promptDialog = usePromptDialog();
 *   const name = await promptDialog.prompt({ title: 'Enter name', defaultValue: 'John' });
 *   if (name !== null) { ... }
 */
export function usePromptDialog() {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePromptDialog must be used within a PromptProvider');
  }
  return context;
}

/**
 * Provider for prompt dialogs — add to layout (alongside ConfirmProvider).
 */
export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<
    (PromptOptions & { resolve: (value: string | null) => void }) | null
  >(null);

  // Track input value — must be declared before callbacks that use setInputValue
  const [inputValue, setInputValue] = useState('');

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    // Set default value when dialog opens (avoids setState-in-effect)
    setInputValue(options.defaultValue || '');
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!dialog) return;
    dialog.resolve(inputValue);
    setDialog(null);
    setInputValue('');
  }, [dialog, inputValue]);

  const handleCancel = useCallback(() => {
    if (!dialog) return;
    dialog.resolve(null);
    setDialog(null);
    setInputValue('');
  }, [dialog]);

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      {dialog && (
        <PromptDialogInner
          {...dialog}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </PromptContext.Provider>
  );
}

interface PromptDialogInnerProps extends PromptOptions {
  inputValue: string;
  onInputChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function PromptDialogInner({
  title,
  message,
  placeholder,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  secret = false,
  multiline = false,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
}: PromptDialogInnerProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus the input when dialog opens
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !multiline) {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-title"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-sm bg-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 id="prompt-title" className="text-sm font-semibold text-white">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {message && <p className="text-sm text-gray-400 mb-3">{message}</p>}
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={placeholder}
              rows={6}
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-y"
              aria-label={title}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={secret ? 'password' : 'text'}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              aria-label={title}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 bg-gray-900/50">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 h-10"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white h-10"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
