import React from 'react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';

export function GlobalFooter({ className }: { className?: string }) {
  const { isHighContrastEnabled } = useAccessibility();
  return (
    <div 
      className={cn("w-full text-center py-4 select-none mt-auto shrink-0", className)}
      role="text"
      aria-label="Disclaimer: AUDScan is not affiliated with or endorsed by the Reserve Bank of Australia."
    >
      <p 
        className={cn(
          "text-[9px] font-medium tracking-tight leading-normal",
          isHighContrastEnabled ? "text-white font-black" : "text-[#6B8099]"
        )}
      >
        AUDScan is not affiliated with or endorsed by the Reserve Bank of Australia.
      </p>
    </div>
  );
}
