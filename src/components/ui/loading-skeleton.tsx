'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Mobile-optimized loading skeleton component
 * Provides visual feedback during data loading
 */
export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-700/50 rounded';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-lg h-24',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-700/50 via-gray-600/50 to-gray-700/50 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], animationClasses[animation], className)}
      style={style}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
    />
  );
}

/**
 * Skeleton for work zone summary card
 */
export function WorkZoneSkeleton() {
  return (
    <div
      className="bg-gray-800 rounded-lg p-4 space-y-3"
      role="status"
      aria-label="Loading work zone data"
    >
      <div className="flex justify-between items-center">
        <Skeleton width={120} height={20} />
        <Skeleton width={60} height={16} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </div>
      <Skeleton variant="text" width="80%" />
      <div className="flex gap-2">
        <Skeleton width={100} height={36} className="rounded-md" />
        <Skeleton width={100} height={36} className="rounded-md" />
      </div>
      <span className="sr-only">Loading work zone information...</span>
    </div>
  );
}

/**
 * Skeleton for speed zone layout
 */
export function SpeedZoneSkeleton() {
  return (
    <div
      className="bg-gray-800 rounded-lg p-4 space-y-2"
      role="status"
      aria-label="Loading speed zones"
    >
      <Skeleton variant="text" width={100} height={16} />
      <Skeleton height={32} className="w-full" />
      <div className="flex justify-between">
        <Skeleton variant="text" width={40} />
        <Skeleton variant="text" width={40} />
        <Skeleton variant="text" width={40} />
        <Skeleton variant="text" width={40} />
      </div>
      <span className="sr-only">Loading speed zone data...</span>
    </div>
  );
}

/**
 * Skeleton for signage corridor
 */
export function SignageSkeleton() {
  return (
    <div
      className="bg-gray-800 rounded-lg p-4 space-y-3"
      role="status"
      aria-label="Loading signage data"
    >
      <Skeleton variant="text" width={120} height={16} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
          <Skeleton width={60} height={24} />
        </div>
      ))}
      <span className="sr-only">Loading signage information...</span>
    </div>
  );
}

/**
 * Skeleton for traffic section
 */
export function TrafficSkeleton() {
  return (
    <div
      className="bg-gray-800 rounded-lg p-4 space-y-3"
      role="status"
      aria-label="Loading traffic data"
    >
      <Skeleton variant="text" width={100} height={16} />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton height={50} />
        <Skeleton height={50} />
        <Skeleton height={50} />
      </div>
      <Skeleton height={60} />
      <span className="sr-only">Loading traffic data...</span>
    </div>
  );
}

/**
 * Skeleton for weather section
 */
export function WeatherSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4" role="status" aria-label="Loading weather data">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="space-y-1">
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="text" width={80} height={12} />
          </div>
        </div>
        <div className="text-right space-y-1">
          <Skeleton variant="text" width={50} height={20} />
          <Skeleton variant="text" width={70} height={12} />
        </div>
      </div>
      <span className="sr-only">Loading weather information...</span>
    </div>
  );
}

/**
 * Full page loading skeleton for home page
 */
export function HomePageSkeleton() {
  return (
    <div className="max-w-lg mx-auto p-4 space-y-4" role="status" aria-label="Loading page">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton width={180} height={28} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>

      {/* Region/Road selector skeleton */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <Skeleton variant="text" width={80} />
        <Skeleton height={40} />
        <Skeleton variant="text" width={80} />
        <Skeleton height={40} />
        <div className="flex gap-2">
          <Skeleton width={80} height={40} />
          <Skeleton width={80} height={40} />
        </div>
        <Skeleton height={48} className="w-full" />
      </div>

      {/* Work zone summary skeleton */}
      <WorkZoneSkeleton />

      {/* Speed zone skeleton */}
      <SpeedZoneSkeleton />

      {/* Signage skeleton */}
      <SignageSkeleton />

      <span className="sr-only">Loading TC Work Zone Locator...</span>
    </div>
  );
}

/**
 * Drive page loading skeleton
 */
export function DrivePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 p-4" role="status" aria-label="Loading drive mode">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton width={120} height={20} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center flex-1 space-y-6 pt-8">
        <Skeleton width={200} height={24} />
        <Skeleton variant="text" width={150} height={80} className="text-6xl" />
        <Skeleton width={180} height={20} />

        {/* Speed display */}
        <div className="flex gap-8 mt-8">
          <div className="text-center">
            <Skeleton width={80} height={60} />
            <Skeleton variant="text" width={40} height={12} className="mt-1" />
          </div>
          <div className="text-center">
            <Skeleton variant="circular" width={80} height={80} />
            <Skeleton variant="text" width={40} height={12} className="mt-1" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading GPS tracking...</span>
    </div>
  );
}
