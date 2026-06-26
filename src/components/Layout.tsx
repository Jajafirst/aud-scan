import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { cn } from '@/src/lib/utils';

export function Layout() {
  const location = useLocation();
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const isScanScreen = location.pathname === '/scan';

  return (
    <div className={cn(
      "min-h-screen text-text font-sans pb-24 selection:bg-gold/30",
      isHighContrastEnabled ? "bg-black" : "bg-bg",
      isLargeTextEnabled && "text-lg"
    )}>
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative shadow-2xl shadow-black/50">
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
        {!isScanScreen && <BottomTabs />}
      </div>
    </div>
  );
}
