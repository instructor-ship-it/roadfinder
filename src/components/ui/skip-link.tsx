/**
 * Skip Link Component
 *
 * Provides keyboard navigation accessibility by allowing users to skip
 * directly to the main content, bypassing navigation elements.
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/general/G1
 */

'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Target element ID to skip to */
  targetId?: string;
  /** Link text content */
  label?: string;
}

/**
 * Skip Link component for accessibility
 *
 * @example
 * <SkipLink targetId="main-content" />
 *
 * // In your main content area:
 * <main id="main-content" tabIndex={-1}>
 *   ...
 * </main>
 */
export const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ targetId = 'main-content', label = 'Skip to main content', className, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.tabIndex = -1;
        target.focus();
        // Scroll to the target
        target.scrollIntoView({ behavior: 'smooth' });
      }
    };

    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        onClick={handleClick}
        className={cn(
          // Visually hidden by default
          'sr-only focus:not-sr-only',
          // When focused, show as a prominent button
          'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
          'focus:bg-white focus:text-gray-900',
          'focus:px-4 focus:py-2 focus:rounded-md',
          'focus:shadow-lg focus:ring-2 focus:ring-blue-500',
          'focus:outline-none',
          'transition-all',
          className
        )}
        {...props}
      >
        {label}
      </a>
    );
  }
);

SkipLink.displayName = 'SkipLink';

/**
 * Skip to navigation link
 */
export const SkipToNav = forwardRef<HTMLAnchorElement, Omit<SkipLinkProps, 'targetId' | 'label'>>(
  (props, ref) => (
    <SkipLink ref={ref} targetId="main-navigation" label="Skip to navigation" {...props} />
  )
);

SkipToNav.displayName = 'SkipToNav';

export default SkipLink;
