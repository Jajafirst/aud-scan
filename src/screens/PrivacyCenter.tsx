import React, { useState } from 'react';
import { Shield, Trash2, ArrowLeft, CheckCircle2, ShieldAlert, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { GlobalFooter } from '@/src/components/GlobalFooter';

export function PrivacyCenter() {
  const navigate = useNavigate();
  const { isLargeTextEnabled, isHighContrastEnabled } = useAccessibility();
  const [isClearing, setIsClearing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [onDeviceOnly, setOnDeviceOnly] = useState(true);

  const handleClearHistory = () => {
    setIsClearing(true);
    setTimeout(() => {
      localStorage.removeItem('recentScans');
      setIsClearing(false);
      setIsDone(true);
      setTimeout(() => setIsDone(false), 3000);
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex-1 flex flex-col p-6 pt-10 min-h-screen",
        isHighContrastEnabled ? "bg-black" : "bg-bg",
        isLargeTextEnabled && "text-lg"
      )}
    >
      <header className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate(-1)}
          className={cn(
            "p-2.5 bg-surface-2 rounded-full border border-border active:scale-90 transition-transform",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
        >
          <ArrowLeft size={20} className={cn("text-text-mid", isHighContrastEnabled && "text-[#CCFF00]")} />
        </button>
        <div>
          <h1 className={cn("text-2xl font-black tracking-tight text-white", (isHighContrastEnabled || isLargeTextEnabled) && "text-3xl")}>Privacy Center</h1>
          <p className={cn("text-[10px] text-text-dim font-mono tracking-widest uppercase", (isHighContrastEnabled || isLargeTextEnabled) && "text-white font-bold")}>Your data, your control</p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Stats Section */}
        <section className={cn(
          "bg-surface-2 rounded-3xl border border-border p-6 shadow-xl",
          isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
        )}>
          <div className="flex items-center justify-between mb-2">
            <h2 className={cn("text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]", isHighContrastEnabled && "text-white font-black text-xs")}>Local Storage</h2>
            <div className={cn(
              "px-2 py-1 bg-green/10 rounded-md text-[10px] font-bold text-green uppercase tracking-wider",
              isHighContrastEnabled && "bg-[#CCFF00] text-black"
            )}>Secure</div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-black text-white", isHighContrastEnabled && "text-[#CCFF00]")}>12</span>
            <span className={cn("text-sm text-text-mid font-medium", isHighContrastEnabled && "text-white font-black text-base")}>Scans Stored Locally</span>
          </div>
          <p className={cn("mt-4 text-xs text-text-dim leading-relaxed", isHighContrastEnabled && "text-white font-black text-sm")}>
            All verification data is encrypted and stored exclusively on this device. No images ever leave your phone.
          </p>
        </section>

        {/* Settings Section */}
        <section className={cn(
          "bg-surface-2 rounded-3xl border border-border overflow-hidden",
          isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
        )}>
          <div className={cn("p-6 border-b border-border flex items-center justify-between", isHighContrastEnabled && "border-[#CCFF00]")}>
            <div className="flex-1 pr-4">
              <h3 className={cn("text-sm font-bold text-white mb-1", isHighContrastEnabled && "text-base font-black")}>On-Device Processing Only</h3>
              <p className={cn("text-[11px] text-text-dim leading-snug", isHighContrastEnabled && "text-white font-black text-xs")}>
                Forces all AI analysis to run locally without cloud assistance.
              </p>
            </div>
            <button 
              onClick={() => setOnDeviceOnly(!onDeviceOnly)}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                onDeviceOnly 
                  ? (isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-gold") 
                  : "bg-surface-3"
              )}
            >
              <motion.div 
                animate={{ x: onDeviceOnly ? 26 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          <div className="p-6">
            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className={cn(
                "w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-xs uppercase tracking-widest border-2",
                isClearing 
                  ? "bg-surface-3 border-transparent text-text-dim cursor-not-allowed" 
                  : (isHighContrastEnabled 
                      ? "bg-black border-[#CCFF00] text-[#CCFF00]" 
                      : "bg-red/5 border-red/40 text-red hover:bg-red/10 active:scale-[0.98]")
              )}
            >
              {isClearing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <RefreshCcw size={16} />
                </motion.div>
              ) : (
                <Trash2 size={16} />
              )}
              {isClearing ? 'Clearing...' : 'Delete All Scan History'}
            </button>

            <AnimatePresence>
              {isDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "mt-4 flex items-center justify-center gap-2 text-green text-[10px] font-bold uppercase tracking-widest",
                    isHighContrastEnabled && "text-[#CCFF00] text-xs"
                  )}
                >
                  <CheckCircle2 size={14} />
                  History Wiped
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Commitment Section */}
        <section className={cn(
          "bg-gold/5 border border-gold/20 rounded-3xl p-6",
          isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <Shield size={20} className={cn("text-gold", isHighContrastEnabled && "text-[#CCFF00]")} />
            <h2 className={cn("text-sm font-bold text-gold uppercase tracking-widest", isHighContrastEnabled && "text-[#CCFF00] font-black")}>Privacy Commitment</h2>
          </div>
          <p className={cn("text-xs text-text-mid leading-relaxed", isHighContrastEnabled && "text-white font-black text-sm")}>
            AUDScan is built by privacy advocates. We believe your financial interactions are your business. Our code is designed to be "zero-knowledge" regarding your identity.
          </p>
        </section>
      </div>
      <GlobalFooter className="mt-8 mb-4" />
    </motion.div>
  );
}
