'use client';

import { BottomNav, BottomNavSpacer, useShowBottomNav } from '@/components/ui/bottom-nav';

export function BottomNavWrapper() {
  const showBottomNav = useShowBottomNav();
  if (!showBottomNav) return null;
  return (
    <>
      <BottomNavSpacer />
      <BottomNav />
    </>
  );
}
