import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Compass } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { GlobalFooter } from './GlobalFooter';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const { isHighContrastEnabled } = useAccessibility();

  React.useEffect(() => {
    if (onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 3000); // 3 seconds splash screen
      return () => clearTimeout(timer);
    }
  }, [onAnimationComplete]);

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[110] flex flex-col items-center justify-between p-8 overflow-hidden",
        isHighContrastEnabled ? "bg-black" : "bg-[#080B0F]"
      )}
    >
      {/* Decorative ambient glow background */}
      {!isHighContrastEnabled && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gold/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#4A9EE8]/5 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Spacer to push content down */}
      <div className="flex-1" />

      {/* Main Branding Core (Centered) */}
      <div className="flex flex-col items-center text-center max-w-sm w-full select-none z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-6"
        >
          {/* Animated radar/scanning ripples */}
          {!isHighContrastEnabled && (
            <>
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0, 0.15] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset--4 rounded-full border border-gold/40"
              />
              <motion.div 
                animate={{ scale: [1, 1.8, 1], opacity: [0.08, 0, 0.08] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute inset--8 rounded-full border border-gold/20"
              />
            </>
          )}

          {/* Core App Icon Shield */}
          <div className={cn(
            "w-28 h-28 rounded-[32px] flex items-center justify-center shadow-2xl relative bg-[#0E1318] border border-border/80",
            isHighContrastEnabled && "border-2 border-[#CCFF00]"
          )}>
            <Compass size={56} className={isHighContrastEnabled ? "text-[#CCFF00]" : "text-gold"} />
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute right-4 bottom-4 w-6 h-6 rounded-full bg-surface2/80 border border-white/10 flex items-center justify-center shadow"
            >
              <ShieldAlert size={12} className={isHighContrastEnabled ? "text-[#CCFF00]" : "text-gold"} />
            </motion.div>
          </div>
        </motion.div>

        {/* Text Logo with subtle tracking */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className={cn(
            "text-4xl font-extrabold italic text-gold tracking-tight mb-2 uppercase",
            isHighContrastEnabled && "text-[#CCFF00]"
          )}>
            AUDScan
          </h1>
          <p className={cn(
            "text-xs uppercase tracking-[0.25em] font-medium text-textDim",
            isHighContrastEnabled && "text-white font-black"
          )}>
            Forensic Banknote Audit
          </p>
        </motion.div>
      </div>

      {/* Spacer to align disclaimer at bottom */}
      <div className="flex-1" />

      {/* Legal Compliance and Technical Audit Footer */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center px-4"
      >
        <GlobalFooter />
        <span className="text-[9px] font-mono tracking-wider text-[#4A6080] font-bold select-none whitespace-pre mt-1">
          v1.0.0 (Build 100)
        </span>
      </motion.div>
    </div>
  );
}
