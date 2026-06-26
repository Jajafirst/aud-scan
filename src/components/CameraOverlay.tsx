import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { NoteSide } from '@/src/lib/SideDetectionLogic';
import { RefreshCcw } from 'lucide-react';

interface CameraOverlayProps {
  isScanning: boolean;
  isAngleValid: boolean;
  detectedSide: NoteSide;
  isFlipping: boolean;
  analysisStep: string;
  pitch: number;
}

export function CameraOverlay({ 
  isScanning, 
  isAngleValid, 
  detectedSide, 
  isFlipping, 
  analysisStep,
  pitch
}: CameraOverlayProps) {
  const { isHighContrastEnabled } = useAccessibility();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
      {/* Vertical Viewfinder */}
      <div className={cn(
        "relative w-[70%] aspect-[1/1.7] border-2 border-white/20 rounded-[40px] shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] transition-all duration-500",
        isHighContrastEnabled && "border-4 border-[#CCFF00]",
        !isAngleValid && "border-red/50 shadow-[0_0_0_1000px_rgba(255,0,0,0.2)]"
      )}>
        {/* Side Indicator Label */}
        <div className="absolute -top-12 left-0 right-0 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2",
              isHighContrastEnabled && "border-[#CCFF00] bg-black"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              detectedSide === 'FRONT' ? "bg-gold" : "bg-blue-400",
              isHighContrastEnabled && "bg-[#CCFF00]"
            )} />
            <span className={cn(
              "text-[10px] font-black text-white uppercase tracking-widest",
              isHighContrastEnabled && "text-[#CCFF00]"
            )}>
              {detectedSide === 'BACK' ? 'Scanning Back Features...' : 'Scanning Front Side'}
            </span>
          </motion.div>
        </div>

        {/* Animated Scanning Line */}
        <motion.div
          animate={{ top: ['10%', '90%', '10%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_20px_rgba(212,168,67,1)]",
            isHighContrastEnabled && "via-[#CCFF00] h-1 shadow-[0_0_30px_#CCFF00]"
          )}
        />
        
        {/* Corner Accents */}
        <div className={cn("absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-gold rounded-tl-[40px]", isHighContrastEnabled && "border-[#CCFF00] border-t-8 border-l-8")} />
        <div className={cn("absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-gold rounded-tr-[40px]", isHighContrastEnabled && "border-[#CCFF00] border-t-8 border-r-8")} />
        <div className={cn("absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-gold rounded-bl-[40px]", isHighContrastEnabled && "border-[#CCFF00] border-b-8 border-l-8")} />
        <div className={cn("absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-gold rounded-br-[40px]", isHighContrastEnabled && "border-[#CCFF00] border-b-8 border-r-8")} />

        {/* Flip Animation Overlay */}
        <AnimatePresence>
          {isFlipping && (
            <motion.div
              initial={{ rotateY: 0, opacity: 0 }}
              animate={{ rotateY: 180, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-4 bg-gold/20 backdrop-blur-sm rounded-[32px] flex flex-col items-center justify-center border-2 border-gold/40"
            >
              <RefreshCcw size={48} className="text-gold animate-spin" />
              <span className="mt-4 text-gold font-black uppercase tracking-widest text-xs">Flip Note</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Angle Warning */}
        {!isAngleValid && (
          <div className="absolute inset-0 flex items-center justify-center bg-red/10 backdrop-blur-[2px] rounded-[40px]">
            <span className="text-white font-black text-[10px] uppercase tracking-[0.3em] bg-red px-4 py-2 rounded-lg">Flatten Note</span>
          </div>
        )}
      </div>

      {/* Scanning Overlay */}
      <AnimatePresence>
        {isScanning && !isFlipping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center"
          >
            <div className="relative w-24 h-24 mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className={cn(
                  "absolute inset-0 border-4 border-gold/20 border-t-gold rounded-full",
                  isHighContrastEnabled && "border-[#CCFF00]/20 border-t-[#CCFF00] border-8"
                )}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCcw className={cn("text-gold animate-pulse", isHighContrastEnabled && "text-[#CCFF00]")} size={32} />
              </div>
            </div>
            <h2 className={cn("text-xl font-bold text-white mb-2 uppercase tracking-widest", isHighContrastEnabled && "text-2xl font-black")}>Analyzing Note</h2>
            <p className={cn("text-text-dim text-xs font-mono uppercase tracking-[0.2em]", isHighContrastEnabled && "text-white font-black text-sm")}>{analysisStep}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tilt Meter (Integrated into Overlay) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <div className={cn(
          "h-48 w-1 bg-white/10 rounded-full relative overflow-hidden",
          isHighContrastEnabled && "bg-white/30 w-2"
        )}>
          <motion.div 
            animate={{ height: `${Math.min(100, Math.max(0, (pitch / 90) * 100))}%` }}
            className={cn("absolute bottom-0 left-0 right-0 bg-gold", isHighContrastEnabled && "bg-[#CCFF00]")}
          />
        </div>
        <span className={cn("text-[8px] font-mono text-white/40", isHighContrastEnabled && "text-white font-black text-[10px]")}>{Math.round(pitch)}°</span>
      </div>
    </div>
  );
}
