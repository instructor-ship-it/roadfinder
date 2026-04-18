'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Navigation, BookOpen, Wrench, Settings } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  matchPatterns?: string[];
}

/**
 * Bottom navigation bar optimized for mobile
 * - Fixed at bottom for easy thumb access
 * - High contrast icons for outdoor visibility
 * - Active state clearly visible
 */
export function BottomNav() {
  const pathname = usePathname();

  // Navigation items
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      href: '/',
    },
    {
      id: 'drive',
      label: 'Drive',
      icon: <Navigation className="w-5 h-5" />,
      href: '/drive?autostart=true',
      matchPatterns: ['/drive'],
    },
    {
      id: 'library',
      label: 'Library',
      icon: <BookOpen className="w-5 h-5" />,
      href: '/library',
      matchPatterns: ['/library'],
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: <Wrench className="w-5 h-5" />,
      href: '/cycle-timer',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      href: '/settings',
    },
  ];

  const isActive = (item: NavItem): boolean => {
    if (item.id === 'tools') {
      // Tools is active on tool-related pages
      const toolPages = [
        '/cycle-timer',
        '/traffic-counter',
        '/aftercare',
        '/contacts',
        '/calibrate',
      ];
      return toolPages.some((p) => pathname.startsWith(p));
    }
    if (item.id === 'settings') {
      return pathname === '/settings';
    }
    if (item.href === '/' && pathname === '/') return true;
    if (item.matchPatterns) {
      return item.matchPatterns.some((pattern) => pathname.startsWith(pattern));
    }
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 safe-area-pb"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-colors',
                'touch-manipulation', // Prevents double-tap zoom on mobile
                active ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200 active:text-cyan-300'
              )}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <div className={cn('p-1.5 rounded-lg transition-colors', active && 'bg-cyan-400/10')}>
                {item.icon}
              </div>
              <span className={cn('text-[10px] mt-0.5 font-medium', active && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
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
  const hideOnPages = ['/drive', '/calibrate'];

  return !hideOnPages.some((page) => pathname.startsWith(page));
}
