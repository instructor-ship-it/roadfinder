'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Navigation, BookOpen, Wrench, Settings, ChevronUp } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  matchPatterns?: string[];
  action?: () => void; // Optional action for buttons
}

/**
 * Bottom navigation bar optimized for mobile
 * - Fixed at bottom for easy thumb access
 * - High contrast icons for outdoor visibility
 * - Active state clearly visible
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine which nav items to show based on current page
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
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
        href: '/drive',
        matchPatterns: ['/drive'],
      },
      {
        id: 'library',
        label: 'Library',
        icon: <BookOpen className="w-5 h-5" />,
        href: '/library',
        matchPatterns: ['/library'],
      },
    ];

    // Tools - always show, links to cycle-timer as main tool hub
    baseItems.push({
      id: 'tools',
      label: 'Tools',
      icon: <Wrench className="w-5 h-5" />,
      href: '/cycle-timer',
    });

    // Settings - scroll to top of home page where settings drawer is
    baseItems.push({
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      href: '/',
    });

    return baseItems;
  };

  const navItems = getNavItems();

  const isActive = (item: NavItem): boolean => {
    if (item.id === 'settings') return false; // Settings never shows as active
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
    if (item.href === '/' && pathname === '/') return true;
    if (item.matchPatterns) {
      return item.matchPatterns.some((pattern) => pathname.startsWith(pattern));
    }
    return false;
  };

  const handleClick = (item: NavItem, e: React.MouseEvent) => {
    // For Settings on home page - scroll to top to show settings button
    if (item.id === 'settings' && pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Also show a hint to tap the hamburger menu
      const settingsHint = document.getElementById('settings-hint');
      if (settingsHint) {
        settingsHint.classList.remove('opacity-0');
        setTimeout(() => settingsHint.classList.add('opacity-0'), 2000);
      }
    }
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
              onClick={(e) => handleClick(item, e)}
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
