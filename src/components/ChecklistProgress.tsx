import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, ShieldAlert } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { GLOBAL_FEATURES, SERIES_FEATURES, DENOMINATION_SPECIFIC } from '@/src/lib/ChecklistMatrix';

interface ChecklistProgressProps {
  checks: {
    label: string;
    status: 'pending' | 'passed' | 'failed';
  }[];
  isVisible: boolean;
  noteTitle?: string;
}

const getFeatureDescription = (label: string): string => {
  const allFeatures = [
    ...GLOBAL_FEATURES,
    ...Object.values(SERIES_FEATURES).flat(),
    ...Object.values(DENOMINATION_SPECIFIC).flatMap(s => Object.values(s).flat())
  ];
  const found = allFeatures.find(f => f.label.toLowerCase() === label.toLowerCase());
  return found ? found.description : '';
};

export function ChecklistProgress({ checks, isVisible, noteTitle }: ChecklistProgressProps) {
  const { isHighContrastEnabled } = useAccessibility();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={cn(
            "absolute left-6 top-1/2 -translate-y-1/2 w-64 bg-black/75 backdrop-blur-md rounded-2xl border border-white/10 p-4 space-y-3 shadow-2xl z-50 overflow-y-auto max-h-[80vh]",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
        >
          {noteTitle ? (
            <div className="flex flex-col">
              {/* Green confirmation bar */}
              <div 
                className={cn(
                  "bg-green/10 border border-green/30 rounded-xl py-1.5 px-2.5 text-center",
                  isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
                )}
              >
                <span className={cn("text-[9px] font-extrabold text-[#2DD4A0] uppercase tracking-wider", isHighContrastEnabled && "text-[#CCFF00]")}>
                  {noteTitle}
                </span>
              </div>
              
              {/* AI-Assisted classification subtitle */}
              <div 
                style={{
                  fontSize: '9px',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: '#6B8099',
                  marginTop: '4px',
                  marginBottom: '8px'
                }}
                className="text-center leading-normal"
              >
                ✨ AI-Assisted classification based on visual patterns
              </div>
            </div>
          ) : (
            <h3 className={cn(
              "text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-2",
              isHighContrastEnabled && "text-white text-[10px]"
            )}>Verification Checklist</h3>
          )}
          
          <div className="space-y-3">
            {checks.map((check, idx) => {
              const desc = getFeatureDescription(check.label);
              const statusLabel = check.status === 'passed' ? 'Pass' : check.status === 'failed' ? 'Fail' : 'Pending';
              
              return (
                <motion.div 
                  key={check.label}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-2.5 py-1"
                  role="text"
                  aria-label={`Check item: ${check.label}. ${desc}. Guided assessment only. Status: ${statusLabel}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {check.status === 'passed' ? (
                      <CheckCircle2 size={14} className="text-green" />
                    ) : check.status === 'failed' ? (
                      <ShieldAlert size={14} className="text-amber" />
                    ) : (
                      <Circle size={14} className="text-white/20" />
                    )}
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "text-[10px] font-bold tracking-tight truncate",
                      check.status === 'pending' ? "text-white/40" : "text-white",
                      isHighContrastEnabled && check.status === 'pending' && "text-white/60",
                      isHighContrastEnabled && check.status !== 'pending' && "text-[#CCFF00]"
                    )}>
                      {check.label}
                    </span>
                    
                    {desc && (
                      <span className="text-[9px] text-[#6B8099] font-medium leading-tight mt-0.5">
                        {desc}
                      </span>
                    )}
                    
                    <span 
                      style={{
                        fontSize: '8px',
                        fontWeight: 500,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#4A6080',
                        marginTop: '1.5px'
                      }}
                    >
                      (Guided assessment only)
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
