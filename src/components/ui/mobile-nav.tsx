'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronLeft, Menu, Home, AlertCircle } from 'lucide-react';

interface MobileNavProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  onBackClick?: () => void;
  showHome?: boolean;
  rightContent?: React.ReactNode;
  emergencyButton?: React.ReactNode;
  offlineStatus?: 'online' | 'offline' | 'partial';
  className?: string;
}

/**
 * Back button component - defined outside render
 */
function BackButton({
  showBack,
  backHref,
  backLabel,
  onBackClick,
}: {
  showBack: boolean;
  backHref?: string;
  backLabel: string;
  onBackClick?: () => void;
}) {
  if (!showBack) return null;

  if (backHref && !onBackClick) {
    return (
      <Link
        href={backHref}
        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors h-10 px-2 -ml-2"
        aria-label={backLabel}
      >
        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        <span className="text-sm hidden sm:inline">{backLabel}</span>
      </Link>
    );
  }

  return (
    <button
      onClick={onBackClick}
      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors h-10 px-2 -ml-2"
      aria-label={backLabel}
    >
      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
      <span className="text-sm hidden sm:inline">{backLabel}</span>
    </button>
  );
}

/**
 * Consistent mobile navigation header component
 * Provides unified navigation across all pages
 */
export function MobileNav({
  title = 'TC Work Zone Locator',
  subtitle,
  showBack = false,
  backHref,
  backLabel = 'Back',
  onBackClick,
  showHome = false,
  rightContent,
  emergencyButton,
  offlineStatus,
  className,
}: MobileNavProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800',
        className
      )}
      role="banner"
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Left: Back button or Home */}
        <div className="flex items-center gap-2 min-w-[60px]">
          {showBack && (
            <BackButton
              showBack={showBack}
              backHref={backHref}
              backLabel={backLabel}
              onBackClick={onBackClick}
            />
          )}
          {showHome && (
            <Link
              href="/"
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors h-10 px-2 -ml-2"
              aria-label="Go to home"
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm hidden sm:inline">Home</span>
            </Link>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex-1 text-center min-w-0">
          <h1 className="text-base font-semibold text-white truncate" role="heading" aria-level={1}>
            {title}
          </h1>
          {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
        </div>

        {/* Right: Status indicators and actions */}
        <div className="flex items-center gap-2 min-w-[60px] justify-end">
          {/* Offline status indicator */}
          {offlineStatus && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                offlineStatus === 'online' && 'bg-green-900/50 text-green-400',
                offlineStatus === 'offline' && 'bg-amber-900/50 text-amber-400',
                offlineStatus === 'partial' && 'bg-amber-900/50 text-amber-400'
              )}
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">
                {offlineStatus === 'online' ? 'Online' : 'Offline mode'}
              </span>
              {offlineStatus === 'online' ? '●' : '○'}
            </div>
          )}

          {/* Emergency button */}
          {emergencyButton}

          {/* Custom right content (e.g., settings) */}
          {rightContent}
        </div>
      </div>
    </header>
  );
}

/**
 * Mobile-friendly page container with proper padding and max-width
 */
interface MobilePageProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
  noPadding?: boolean;
}

export function MobilePage({
  children,
  className,
  fullHeight = false,
  noPadding = false,
}: MobilePageProps) {
  return (
    <main
      className={cn(
        'bg-gray-900 text-white min-h-screen',
        fullHeight && 'h-screen flex flex-col',
        !noPadding && 'pb-6', // Bottom padding for safe area
        className
      )}
      role="main"
    >
      <div className={cn('max-w-lg mx-auto w-full', !noPadding && 'px-4')}>{children}</div>
    </main>
  );
}

/**
 * Mobile-friendly section with collapsible header
 */
interface MobileSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
  badge?: string | number;
  variant?: 'default' | 'warning' | 'success' | 'error';
}

export function MobileSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  onToggle,
  className,
  badge,
  variant = 'default',
}: MobileSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const handleToggle = () => {
    const newState = !expanded;
    setExpanded(newState);
    onToggle?.(newState);
  };

  const variantStyles = {
    default: 'border-gray-800',
    warning: 'border-amber-800/50 bg-amber-900/10',
    success: 'border-green-800/50 bg-green-900/10',
    error: 'border-red-800/50 bg-red-900/10',
  };

  return (
    <section
      className={cn(
        'bg-gray-800 rounded-lg border overflow-hidden',
        variantStyles[variant],
        className
      )}
      aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750 transition-colors"
        aria-expanded={expanded}
        aria-controls={`section-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-lg" aria-hidden="true">
              {icon}
            </span>
          )}
          <h2 className="text-sm font-semibold text-blue-400">{title}</h2>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
              {badge}
            </span>
          )}
        </div>
        <span
          className={cn(
            'text-gray-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      <div
        id={`section-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className={cn(
          'transition-all duration-200 overflow-hidden',
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!expanded}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </section>
  );
}

/**
 * Mobile-friendly alert banner for errors, warnings, info
 */
interface MobileAlertProps {
  variant: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  action?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function MobileAlert({
  variant,
  title,
  message,
  action,
  dismissible = false,
  onDismiss,
  className,
}: MobileAlertProps) {
  const variantStyles = {
    error: {
      bg: 'bg-red-900/20 border-red-800/50',
      text: 'text-red-400',
      icon: <AlertCircle className="w-5 h-5" aria-hidden="true" />,
    },
    warning: {
      bg: 'bg-amber-900/20 border-amber-800/50',
      text: 'text-amber-400',
      icon: <AlertCircle className="w-5 h-5" aria-hidden="true" />,
    },
    info: {
      bg: 'bg-blue-900/20 border-blue-800/50',
      text: 'text-blue-400',
      icon: <AlertCircle className="w-5 h-5" aria-hidden="true" />,
    },
    success: {
      bg: 'bg-green-900/20 border-green-800/50',
      text: 'text-green-400',
      icon: <AlertCircle className="w-5 h-5" aria-hidden="true" />,
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      className={cn('rounded-lg border p-3 flex items-start gap-3', styles.bg, className)}
    >
      <span className={styles.text}>{styles.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <h3 className={cn('font-medium text-sm', styles.text)}>{title}</h3>}
        <p className="text-sm text-gray-300 mt-0.5">{message}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-300 p-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Skip link for accessibility - allows keyboard users to skip to main content
 */
export function SkipLink({ href = '#main-content' }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
