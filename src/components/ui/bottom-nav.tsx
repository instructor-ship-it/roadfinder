'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Navigation, BookOpen, Wrench, Settings, X } from 'lucide-react';

// Library menu items
const LIBRARY_ITEMS = [
  { id: 'library', icon: '📚', label: 'Document Registers', href: '/library' },
  { id: 'qa', icon: '🤖', label: 'AI Q&A Assistant', href: '/qa', badge: 'AI' },
  { id: 'expanded', icon: '📖', label: 'Expanded Library', href: '/library/expanded' },
  { id: 'tmp', icon: '📋', label: 'TMP Documents', href: '/library/tmp' },
];

// Tools menu items
const TOOLS_ITEMS = [
  { id: 'aftercare', icon: '🚧', label: 'AfterCare Signs', href: '/aftercare' },
  { id: 'event-logger', icon: '📝', label: 'Event Logger', href: '/event-logger' },
  { id: 'traffic-counter', icon: '📊', label: 'Traffic Counter', href: '/traffic-counter' },
  { id: 'cycle-timer', icon: '⏱️', label: 'Cycle Timer', href: '/cycle-timer' },
  { id: 'contacts', icon: '👥', label: 'Contact Directory', href: '/contacts' },
];

interface MenuItemProps {
  icon: string;
  label: string;
  href: string;
  badge?: string;
  onClick?: () => void;
}

function MenuItem({ icon, label, href, badge, onClick }: MenuItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 active:bg-gray-600/50 transition-colors"
    >
      <span className="text-xl w-7 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-400 font-medium">
          {badge}
        </span>
      )}
    </Link>
  );
}

interface PopupMenuProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function PopupMenu({ title, isOpen, onClose, children }: PopupMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed bottom-16 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="py-1">{children}</div>
      </div>
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<'library' | 'tools' | null>(null);

  const isLibraryActive = pathname.startsWith('/library') || pathname === '/qa';
  const isToolsActive = [
    '/cycle-timer',
    '/traffic-counter',
    '/aftercare',
    '/contacts',
    '/calibrate',
    '/event-logger',
  ].some((p) => pathname.startsWith(p));

  const isDriveActive = pathname.startsWith('/drive');
  const isSettingsActive = pathname === '/settings';
  const isHomeActive = pathname === '/';

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 safe-area-pb"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {/* Home */}
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-colors',
              'touch-manipulation',
              isHomeActive
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-200 active:text-cyan-300'
            )}
            aria-current={isHomeActive ? 'page' : undefined}
            aria-label="Home"
          >
            <div
              className={cn('p-1.5 rounded-lg transition-colors', isHomeActive && 'bg-cyan-400/10')}
            >
              <Home className="w-5 h-5" />
            </div>
            <span className={cn('text-[10px] mt-0.5 font-medium', isHomeActive && 'font-semibold')}>
              Home
            </span>
          </Link>

          {/* Drive */}
          <Link
            href="/drive?autostart=true"
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-colors',
              'touch-manipulation',
              isDriveActive
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-200 active:text-cyan-300'
            )}
            aria-current={isDriveActive ? 'page' : undefined}
            aria-label="Drive"
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isDriveActive && 'bg-cyan-400/10'
              )}
            >
              <Navigation className="w-5 h-5" />
            </div>
            <span
              className={cn('text-[10px] mt-0.5 font-medium', isDriveActive && 'font-semibold')}
            >
              Drive
            </span>
          </Link>

          {/* Library - Opens popup */}
          <button
            onClick={() => setOpenMenu('library')}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-colors',
              'touch-manipulation',
              isLibraryActive
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-200 active:text-cyan-300'
            )}
            aria-current={isLibraryActive ? 'page' : undefined}
            aria-label="Library"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'library'}
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isLibraryActive && 'bg-cyan-400/10'
              )}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <span
              className={cn('text-[10px] mt-0.5 font-medium', isLibraryActive && 'font-semibold')}
            >
              Library
            </span>
          </button>

          {/* Tools - Opens popup */}
          <button
            onClick={() => setOpenMenu('tools')}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-colors',
              'touch-manipulation',
              isToolsActive
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-200 active:text-cyan-300'
            )}
            aria-current={isToolsActive ? 'page' : undefined}
            aria-label="Tools"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'tools'}
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isToolsActive && 'bg-cyan-400/10'
              )}
            >
              <Wrench className="w-5 h-5" />
            </div>
            <span
              className={cn('text-[10px] mt-0.5 font-medium', isToolsActive && 'font-semibold')}
            >
              Tools
            </span>
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-colors',
              'touch-manipulation',
              isSettingsActive
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-200 active:text-cyan-300'
            )}
            aria-current={isSettingsActive ? 'page' : undefined}
            aria-label="Settings"
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isSettingsActive && 'bg-cyan-400/10'
              )}
            >
              <Settings className="w-5 h-5" />
            </div>
            <span
              className={cn('text-[10px] mt-0.5 font-medium', isSettingsActive && 'font-semibold')}
            >
              Settings
            </span>
          </Link>
        </div>
      </nav>

      {/* Library Popup */}
      <PopupMenu
        title="📚 Library"
        isOpen={openMenu === 'library'}
        onClose={() => setOpenMenu(null)}
      >
        {LIBRARY_ITEMS.map((item) => (
          <MenuItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            href={item.href}
            badge={item.badge}
            onClick={() => setOpenMenu(null)}
          />
        ))}
      </PopupMenu>

      {/* Tools Popup */}
      <PopupMenu
        title="🛠️ TC Tools"
        isOpen={openMenu === 'tools'}
        onClose={() => setOpenMenu(null)}
      >
        {TOOLS_ITEMS.map((item) => (
          <MenuItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            href={item.href}
            onClick={() => setOpenMenu(null)}
          />
        ))}
      </PopupMenu>
    </>
  );
}

/**
 * Wrapper component that adds bottom padding to prevent content being hidden by BottomNav
 */
export function BottomNavSpacer() {
  return <div className="h-16" aria-hidden="true" />;
}

/**
 * Hook to check if bottom nav should be shown
 * Can be used to hide on specific pages
 */
export function useShowBottomNav(): boolean {
  const pathname = usePathname();

  // Hide bottom nav on full-screen pages
  const hideOnPages = ['/drive', '/calibrate', '/event-logger'];

  return !hideOnPages.some((page) => pathname.startsWith(page));
}
