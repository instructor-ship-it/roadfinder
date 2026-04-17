import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-gray-700 animate-pulse rounded-md', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Loading skeleton for a card component
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-800 p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for a list item
 */
function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-3 px-4 border-b border-gray-800', className)}>
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="w-16 h-6 rounded" />
    </div>
  );
}

/**
 * Loading skeleton for a form input
 */
function SkeletonInput({ className, label }: { className?: string; label?: boolean }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Skeleton className="h-4 w-24" />}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

/**
 * Loading skeleton for navigation header
 */
function SkeletonNav({ className }: { className?: string }) {
  return (
    <div className={cn('sticky top-0 z-50 bg-gray-900/95 border-b border-gray-800', className)}>
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Skeleton className="w-8 h-8 rounded-md" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="w-8 h-8 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for a page with sections
 */
function SkeletonPage({ sections = 3, className }: { sections?: number; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-gray-900 pb-20', className)}>
      <SkeletonNav />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {Array.from({ length: sections }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for a timer item (cycle-timer page)
 */
function SkeletonTimer({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-700 bg-gray-800 p-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-3 h-3 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonListItem,
  SkeletonInput,
  SkeletonNav,
  SkeletonPage,
  SkeletonTimer,
};
