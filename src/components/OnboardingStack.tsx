import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Calendar, Bell, ShieldOff, Eye, MapPin, Check, FileText } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GlobalFooter } from './GlobalFooter';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';

// React Native mock for web context matching the Lead Architect request
const Linking = {
  openURL: (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// Mock permissions requester
const requestPermissions = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 600);
  });
};

interface OnboardingStackProps {
  onComplete: () => void;
}

export function OnboardingStack({ onComplete }: OnboardingStackProps) {
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isTermsAccepted, setIsTermsAccepted] = useState<boolean>(false);
  const [highPriorityAlerts, setHighPriorityAlerts] = useState<boolean>(true);
  const [regionalSafetyUpdates, setRegionalSafetyUpdates] = useState<boolean>(true);

  // Task 1: Privacy Notice Screen
  const renderPrivacyNotice = () => {
    return (
      <motion.div
        key="step1"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md flex flex-col flex-1"
      >
        <div className="flex-1 flex flex-col justify-center">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5 bg-[#0E1318] border border-white/5 shadow-xl",
              isHighContrastEnabled && "border-2 border-[#CCFF00]"
            )}>
              <span className="text-4xl" role="img" aria-label="padlock">🔒</span>
            </div>
            <h1 className={cn(
              "text-2xl font-black text-white px-2",
              isLargeTextEnabled && "text-3xl"
            )}>
              Your Privacy is Physical
            </h1>
            <p className="text-xs text-text-dim mt-2 font-mono tracking-widest uppercase">
              On-device promise
            </p>
          </div>

          {/* Three-point high-contrast feature list */}
          <div className="space-y-4 mb-8">
            <div className={cn(
              "p-4 rounded-2xl bg-[#0E1318] border border-white/5 flex gap-4 items-start",
              isHighContrastEnabled && "border-2 border-[#CCFF00] bg-black"
            )}>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <Eye size={18} />
              </div>
              <div className="space-y-1">
                <h3 className={cn("text-xs font-bold text-white uppercase tracking-wider", isLargeTextEnabled && "text-sm")}>
                  On-Device Vision
                </h3>
                <p className="text-xs text-[#9DB5CC] leading-relaxed">
                  Camera images never leave your phone. All scanning occurs locally of the processor.
                </p>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-2xl bg-[#0E1318] border border-white/5 flex gap-4 items-start",
              isHighContrastEnabled && "border-2 border-[#CCFF00] bg-black"
            )}>
              <div className="p-2 rounded-xl bg-amber-500/10 text-[#E5B854] shrink-0">
                <MapPin size={18} />
              </div>
              <div className="space-y-1">
                <h3 className={cn("text-xs font-bold text-white uppercase tracking-wider", isLargeTextEnabled && "text-sm")}>
                  Local Alerts
                </h3>
                <p className="text-xs text-[#9DB5CC] leading-relaxed">
                  Location is suburb-level only to show localized security or law enforcement counterfeit warnings.
                </p>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-2xl bg-[#0E1318] border border-white/5 flex gap-4 items-start",
              isHighContrastEnabled && "border-2 border-[#CCFF00] bg-black"
            )}>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="space-y-1">
                <h3 className={cn("text-xs font-bold text-white uppercase tracking-wider", isLargeTextEnabled && "text-sm")}>
                  No Accounts
                </h3>
                <p className="text-xs text-[#9DB5CC] leading-relaxed">
                  No login, email registering, tracking cookies, or user profile generation required.
                </p>
              </div>
            </div>
          </div>

          {/* Links View Full Privacy Policy */}
          <div className="text-center mb-6">
            <button
              onClick={() => Linking.openURL('https://audscan.org/privacy-policy')}
              className={cn(
                "text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80 underline",
                isHighContrastEnabled ? "text-[#CCFF00]" : "text-[#E5B854]"
              )}
              aria-label="View Full Privacy Policy. Opens in a new tab."
            >
              View Full Privacy Policy
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-4">
          <button
            onClick={() => setCurrentStep(2)}
            className={cn(
              "w-full h-14 rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest active:scale-95 transition-transform",
              isHighContrastEnabled ? "bg-[#CCFF00] text-black border-2 border-black font-black" : "bg-[#D4A843] text-black"
            )}
          >
            I understand, continue
          </button>
          
          <div className="flex justify-center gap-1.5 py-2">
            <div className={cn("w-6 h-1.5 rounded-full", isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-[#D4A843]")} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </motion.div>
    );
  };

  // Task 2: Terms Acceptance Screen
  const renderTermsAcceptance = () => {
    return (
      <motion.div
        key="step2"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md flex flex-col flex-1"
      >
        <div className="flex-1 flex flex-col justify-center">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5 bg-[#0E1318] border border-white/5 shadow-xl",
              isHighContrastEnabled && "border-2 border-[#CCFF00]"
            )}>
              <span className="text-4xl" role="img" aria-label="balance scales">⚖️</span>
            </div>
            <h1 className={cn(
              "text-2xl font-black text-white px-2",
              isLargeTextEnabled && "text-3xl"
            )}>
              Terms of Use
            </h1>
            <p className="text-xs text-text-dim mt-2 font-mono tracking-widest uppercase">
              Operational liability limits
            </p>
          </div>

          {/* Focused card with legal text */}
          <div className={cn(
            "p-6 rounded-3xl bg-[#0E1318] border border-white/5 mb-8 shadow-2xl relative overflow-hidden",
            isHighContrastEnabled && "border-2 border-[#CCFF00] bg-black"
          )}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-700" />
            <p className={cn(
              "text-xs text-[#9DB5CC] leading-relaxed text-center font-medium",
              isLargeTextEnabled && "text-sm leading-relaxed"
            )}>
              AUDScan is an assistive tool for informational purposes. Results are not legally certified authentication. Use at your own discretion.
            </p>
          </div>

          {/* Explicit Terms Checkbox row */}
          <button
            onClick={() => setIsTermsAccepted(!isTermsAccepted)}
            className={cn(
              "w-full p-4 mb-6 rounded-2xl bg-[#0E1318]/40 border border-white/5 flex items-center gap-3 active:scale-[0.99] transition-transform",
              isHighContrastEnabled && "border-2 border-[#CCFF00] bg-black",
              isTermsAccepted ? "border-amber-500/40" : ""
            )}
            role="checkbox"
            aria-checked={isTermsAccepted}
          >
            <div className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center transition-colors border",
              isTermsAccepted 
                ? (isHighContrastEnabled ? "bg-[#CCFF00] border-[#CCFF00] text-black" : "bg-[#D4A843] border-[#D4A843] text-black") 
                : "border-white/20 bg-black/40"
            )}>
              {isTermsAccepted && <Check size={14} strokeWidth={3} />}
            </div>
            <span className="text-xs font-bold text-white text-left">
              I accept the liability disclaimers and limitations of use.
            </span>
          </button>

          {/* External Links */}
          <div className="text-center mb-6">
            <button
              onClick={() => Linking.openURL('https://audscan.org/terms-of-use')}
              className={cn(
                "text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80 underline",
                isHighContrastEnabled ? "text-[#CCFF00]" : "text-[#E5B854]"
              )}
              aria-label="View Terms & Conditions. Opens in a new tab."
            >
              View Terms & Conditions
            </button>
          </div>
        </div>

        {/* Action button (Accept & Proceed, strictly gated by isTermsAccepted) */}
        <div className="space-y-4">
          <button
            disabled={!isTermsAccepted}
            onClick={() => {
              if (isTermsAccepted) {
                setCurrentStep(3);
              }
            }}
            className={cn(
              "w-full h-14 rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest transition-all",
              isTermsAccepted 
                ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black active:scale-95" : "bg-[#D4A843] text-black active:scale-95")
                : "bg-[#1C2530] text-[#6B8099] cursor-not-allowed opacity-50"
            )}
          >
            Accept & Proceed
          </button>
          
          <div className="flex justify-center gap-1.5 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className={cn("w-6 h-1.5 rounded-full", isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-[#D4A843]")} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </motion.div>
    );
  };

  // Task 3: Notification Permission Screen
  const renderNotificationPermission = () => {
    return (
      <motion.div
        key="step3"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md flex flex-col flex-1"
      >
        <div className="flex-1 flex flex-col justify-center">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5 bg-[#0E1318] border border-white/5 shadow-xl",
              isHighContrastEnabled && "border-2 border-[#CCFF00]"
            )}>
              <span className="text-4xl" role="img" aria-label="bell icon">🔔</span>
            </div>
            <h1 className={cn(
              "text-2xl font-black text-white px-2",
              isLargeTextEnabled && "text-3xl"
            )}>
              Stay Alert
            </h1>
            <p className="text-xs text-text-dim mt-2 font-mono tracking-widest uppercase">
              Sub-second Safety Broadcasts
            </p>
          </div>

          {/* Value Prop */}
          <p className={cn(
            "text-xs text-[#9DB5CC] leading-relaxed text-center font-medium max-w-sm mx-auto mb-8 px-4",
            isLargeTextEnabled && "text-sm leading-relaxed"
          )}>
            Get real-time counterfeit warnings from State Police (NSW, VIC, WA, etc.) tailored to your region.
          </p>

          {/* Pre-Permission Toggles */}
          <div className="space-y-4 mb-8">
            <div className={cn(
              "p-4 rounded-2xl bg-[#0E1318] border border-white/5 flex items-center justify-between",
              isHighContrastEnabled && "border-2 border-[#CCFF00] bg-black"
            )}>
              <div className="space-y-0.5">
                <span className={cn("text-xs font-bold text-white uppercase tracking-wider", isLargeTextEnabled && "text-sm")}>
                  High-Priority Police Alerts
                </span>
                <p className="text-[10px] text-text-dim text-left">Highly suspicious pattern notifications.</p>
              </div>
              <button
                onClick={() => setHighPriorityAlerts(!highPriorityAlerts)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0",
                  highPriorityAlerts 
                    ? (isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-[#D4A843]") 
                    : "bg-surface-3",
                  isHighContrastEnabled && "border-2"
                )}
                role="switch"
                aria-checked={highPriorityAlerts}
                aria-label="High-Priority Police Alerts"
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full transition-all bg-white",
                    highPriorityAlerts ? "left-[24px]" : "left-1"
                  )}
                />
              </button>
            </div>

            <div className={cn(
              "p-4 rounded-2xl bg-[#0E1318] border border-white/5 flex items-center justify-between",
              isHighContrastEnabled && "border-2 border-[#CCFF00] bg-black"
            )}>
              <div className="space-y-0.5">
                <span className={cn("text-xs font-bold text-white uppercase tracking-wider", isLargeTextEnabled && "text-sm")}>
                  Regional Safety Updates
                </span>
                <p className="text-[10px] text-text-dim text-left">Counterfeit detection hotspots near you.</p>
              </div>
              <button
                onClick={() => setRegionalSafetyUpdates(!regionalSafetyUpdates)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0",
                  regionalSafetyUpdates 
                    ? (isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-[#D4A843]") 
                    : "bg-surface-3",
                  isHighContrastEnabled && "border-2"
                )}
                role="switch"
                aria-checked={regionalSafetyUpdates}
                aria-label="Regional Safety Updates"
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full transition-all bg-white",
                    regionalSafetyUpdates ? "left-[24px]" : "left-1"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Footnote */}
          <p className="text-[10px] text-text-dim font-mono text-center mb-8 uppercase tracking-widest">
            You can change this in Settings at any time.
          </p>
        </div>

        {/* Action Button */}
        <div className="space-y-4">
          <button
            onClick={async () => {
              await requestPermissions();
              onComplete();
            }}
            className={cn(
              "w-full h-14 rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest active:scale-95 transition-transform",
              isHighContrastEnabled ? "bg-[#CCFF00] text-black border-2 border-black font-black" : "bg-[#D4A843] text-black"
            )}
          >
            Enable Notifications
          </button>
          
          <div className="flex justify-center gap-1.5 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className={cn("w-6 h-1.5 rounded-full", isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-[#D4A843]")} />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex flex-col items-center p-8 overflow-y-auto",
      isHighContrastEnabled ? "bg-black" : "bg-bg"
    )}>
      <AnimatePresence mode="wait">
        {currentStep === 1 && renderPrivacyNotice()}
        {currentStep === 2 && renderTermsAcceptance()}
        {currentStep === 3 && renderNotificationPermission()}
      </AnimatePresence>

      {/* Unified Global Pass: GlobalFooter disclaimer rendered at the bottom of every screening container */}
      <GlobalFooter className="mt-8 shrink-0" />
    </div>
  );
}
