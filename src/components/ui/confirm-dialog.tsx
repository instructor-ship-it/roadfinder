'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Hook to use confirm dialog
 * Returns a promise that resolves to true (confirmed) or false (cancelled)
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

/**
 * Provider for confirm dialogs
 * Add this to your layout to enable useConfirm hook
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog(options);
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef?.(true);
    setDialog(null);
    setResolveRef(null);
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    resolveRef?.(false);
    setDialog(null);
    setResolveRef(null);
  }, [resolveRef]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </ConfirmContext.Provider>
  );
}

/**
 * Standalone confirm dialog component
 */
interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
  isOpen?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  icon,
  onConfirm,
  onCancel,
  isOpen = true,
}: ConfirmDialogProps) {
  const variantConfig = {
    danger: {
      bg: 'bg-red-900/20',
      border: 'border-red-800/50',
      iconBg: 'bg-red-900/30',
      iconColor: 'text-red-400',
      confirmBtn: 'bg-red-600 hover:bg-red-700',
      defaultIcon: <Trash2 className="w-6 h-6" />,
    },
    warning: {
      bg: 'bg-amber-900/20',
      border: 'border-amber-800/50',
      iconBg: 'bg-amber-900/30',
      iconColor: 'text-amber-400',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700',
      defaultIcon: <AlertTriangle className="w-6 h-6" />,
    },
    info: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-800/50',
      iconBg: 'bg-blue-900/30',
      iconColor: 'text-blue-400',
      confirmBtn: 'bg-cyan-600 hover:bg-cyan-700',
      defaultIcon: <Info className="w-6 h-6" />,
    },
    success: {
      bg: 'bg-green-900/20',
      border: 'border-green-800/50',
      iconBg: 'bg-green-900/30',
      iconColor: 'text-green-400',
      confirmBtn: 'bg-green-600 hover:bg-green-700',
      defaultIcon: <CheckCircle className="w-6 h-6" />,
    },
  };

  const config = variantConfig[variant];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-xl border overflow-hidden shadow-2xl',
          config.bg,
          config.border
        )}
      >
        {/* Icon */}
        <div className="pt-6 pb-2 flex justify-center">
          <div
            className={cn('w-14 h-14 rounded-full flex items-center justify-center', config.iconBg)}
          >
            <span className={config.iconColor}>{icon || config.defaultIcon}</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 text-center">
          <h2 id="confirm-title" className="text-lg font-semibold text-white mb-2">
            {title}
          </h2>
          <p id="confirm-message" className="text-gray-300 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 bg-gray-900/50">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 h-12"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className={cn('flex-1 text-white h-12', config.confirmBtn)}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple alert dialog (single button)
 */
interface AlertDialogProps {
  title: string;
  message: string;
  buttonLabel?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  onClose: () => void;
  isOpen?: boolean;
}

export function AlertDialog({
  title,
  message,
  buttonLabel = 'OK',
  variant = 'info',
  icon,
  onClose,
  isOpen = true,
}: AlertDialogProps) {
  const variantConfig = {
    danger: {
      bg: 'bg-red-900/20',
      border: 'border-red-800/50',
      iconBg: 'bg-red-900/30',
      iconColor: 'text-red-400',
      btn: 'bg-red-600 hover:bg-red-700',
      defaultIcon: <XCircle className="w-6 h-6" />,
    },
    warning: {
      bg: 'bg-amber-900/20',
      border: 'border-amber-800/50',
      iconBg: 'bg-amber-900/30',
      iconColor: 'text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-700',
      defaultIcon: <AlertTriangle className="w-6 h-6" />,
    },
    info: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-800/50',
      iconBg: 'bg-blue-900/30',
      iconColor: 'text-blue-400',
      btn: 'bg-cyan-600 hover:bg-cyan-700',
      defaultIcon: <Info className="w-6 h-6" />,
    },
    success: {
      bg: 'bg-green-900/20',
      border: 'border-green-800/50',
      iconBg: 'bg-green-900/30',
      iconColor: 'text-green-400',
      btn: 'bg-green-600 hover:bg-green-700',
      defaultIcon: <CheckCircle className="w-6 h-6" />,
    },
  };

  const config = variantConfig[variant];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      aria-describedby="alert-message"
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-xl border overflow-hidden shadow-2xl',
          config.bg,
          config.border
        )}
      >
        {/* Icon */}
        <div className="pt-6 pb-2 flex justify-center">
          <div
            className={cn('w-14 h-14 rounded-full flex items-center justify-center', config.iconBg)}
          >
            <span className={config.iconColor}>{icon || config.defaultIcon}</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 text-center">
          <h2 id="alert-title" className="text-lg font-semibold text-white mb-2">
            {title}
          </h2>
          <p id="alert-message" className="text-gray-300 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action */}
        <div className="p-4 bg-gray-900/50">
          <Button
            onClick={onClose}
            className={cn('w-full text-white h-12', config.btn)}
            aria-label={buttonLabel}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
