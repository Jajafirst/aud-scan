import React from 'react';
import { 
  Shield, 
  ChevronRight, 
  ArrowLeft, 
  Accessibility, 
  FileText, 
  Trash2, 
  Smartphone, 
  Eye, 
  Volume2,
  BarChart3
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useHistory } from '@/src/contexts/HistoryContext';
import { GlobalFooter } from '@/src/components/GlobalFooter';

export function SettingsScreen() {
  const navigate = useNavigate();
  const { 
    isHapticsEnabled, setHapticsEnabled,
    isHighContrastEnabled, setHighContrastEnabled,
    isAudioGuidanceEnabled, setAudioGuidanceEnabled,
    isLargeTextEnabled
  } = useAccessibility();
  const { isBusinessAccount, setBusinessAccount } = useHistory();

  // Dialog / Modal Visibility States
  const [showTerms, setShowTerms] = React.useState(false);
  const [showAccessStatement, setShowAccessStatement] = React.useState(false);

  // Clear All Storage Function
  const handleDeleteMyData = () => {
    const confirmed = window.confirm("Are you absolutely sure you want to delete all cached states, scan histories, alerts read flags, and onboarding tokens? This operation is irreversible.");
    if (confirmed) {
      localStorage.clear();
      alert("All data wiped instantly. Scan history, cached state parameters, and configuration preferences have been completely destroyed.");
      // Reload app to home screen with wiped cache
      window.location.href = '/';
    }
  };

  const menuItems = [
    {
      title: 'Legal & Privacy',
      items: [
        {
          id: 'privacy',
          label: 'Privacy Policy',
          description: 'Secure on-device data processing, Zero identity extraction commitment.',
          icon: Shield,
          color: 'text-blue-400',
          action: () => navigate('/settings/privacy'),
          accessibilityLabel: 'Privacy Policy',
          accessibilityHint: 'Double tap to open our secure on-device processing documentation.',
        },
        {
          id: 'terms',
          label: 'Terms & Conditions',
          description: 'Use at your own discretion liability limits and definitions.',
          icon: FileText,
          color: 'text-amber-500',
          action: () => setShowTerms(true),
          accessibilityLabel: 'Terms & Conditions',
          accessibilityHint: 'Double tap to read liability terms and disclaimers.',
        },
        {
          id: 'access_stmt',
          label: 'Accessibility Statement',
          description: 'Our verification design commitment to WCAG 2.1 AA benchmarks.',
          icon: Accessibility,
          color: 'text-purple-400',
          action: () => setShowAccessStatement(true),
          accessibilityLabel: 'Accessibility Statement',
          accessibilityHint: 'Double tap to read our commitment to Web Content Accessibility Guidelines.',
        }
      ]
    },
    {
      title: 'Preferences & Utility',
      items: [
        {
          id: 'accessibility_mode',
          label: 'Accessibility Menu',
          description: 'Comprehensive audios, haptics, and text magnifier hubs.',
          icon: Accessibility,
          color: 'text-emerald-400',
          action: () => navigate('/settings/accessibility'),
          accessibilityLabel: 'Accessibility Menu',
          accessibilityHint: 'Double tap to access voice guidance and large text settings.',
        },
        {
          id: 'contrast',
          label: 'High Contrast Mode',
          description: 'Increases readability using solid high-visibility values.',
          icon: Eye,
          type: 'toggle',
          value: isHighContrastEnabled,
          onChange: setHighContrastEnabled,
          color: 'text-yellow-400',
          accessibilityLabel: 'High Contrast Mode',
          accessibilityHint: `Double tap to toggle solid color layouts. Currently ${isHighContrastEnabled ? 'enabled' : 'disabled'}.`,
        },
        {
          id: 'business',
          label: 'Business Account',
          description: 'Allows merchant-level tracking of counterfeit regional flows.',
          icon: Shield,
          type: 'toggle',
          value: isBusinessAccount,
          onChange: setBusinessAccount,
          color: 'text-sky-400',
          accessibilityLabel: 'Business Account',
          accessibilityHint: `Double tap to toggle merchant audit settings. Currently ${isBusinessAccount ? 'enabled' : 'disabled'}.`,
        },
        {
          id: 'analytics',
          label: 'Scan Analytics',
          description: 'Merchant-level summaries, scan count trends, and retention diagnostics.',
          icon: BarChart3,
          color: 'text-violet-400',
          action: () => navigate('/settings/analytics'),
          accessibilityLabel: 'Scan Analytics',
          accessibilityHint: 'Double tap to open rolling 90-day scan volume and pass rate analytics.',
        }
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex-1 flex flex-col p-6 pt-10 min-h-screen relative pb-16",
        isHighContrastEnabled ? "bg-black" : "bg-bg",
        isLargeTextEnabled && "text-lg"
      )}
    >
      <header className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate('/')}
          className={cn(
            "p-2.5 bg-surface-2 rounded-full border border-border active:scale-90 transition-transform",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
          aria-label="Back to home screen"
        >
          <ArrowLeft size={20} className={cn("text-text-mid", isHighContrastEnabled && "text-[#CCFF00]")} />
        </button>
        <div>
          <h1 className={cn("text-2xl font-black tracking-tight text-white", (isHighContrastEnabled || isLargeTextEnabled) && "text-3xl")}>Settings Hub</h1>
          <p className={cn("text-[10px] text-text-dim font-mono tracking-widest uppercase", (isHighContrastEnabled || isLargeTextEnabled) && "text-white font-bold")}>Compliance & Rules Control</p>
        </div>
      </header>

      <div className="space-y-10 flex-1">
        {menuItems.map((group) => (
          <section key={group.title}>
            <h2 className={cn(
              "text-[10px] text-text-dim font-bold tracking-[0.2em] uppercase mb-4 px-1",
              isHighContrastEnabled && "text-white font-black text-xs"
            )}>{group.title}</h2>
            <div className={cn(
              "bg-surface-2 rounded-3xl border border-border overflow-hidden shadow-xl",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
            )}>
              {group.items.map((item, index) => {
                const isToggle = 'type' in item && item.type === 'toggle';
                
                const content = (
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2.5 rounded-xl bg-bg/50 border border-border shrink-0 mt-0.5",
                      isHighContrastEnabled && "bg-black border-[#CCFF00]"
                    )}>
                      <item.icon size={18} className={cn(item.color, isHighContrastEnabled && "text-[#CCFF00]")} />
                    </div>
                    <div className="space-y-0.5">
                      <span className={cn(
                        "text-sm font-bold text-text-mid group-hover:text-white block transition-colors",
                        isHighContrastEnabled && "text-white font-black text-base"
                      )}>{item.label}</span>
                      <p className="text-[10px] text-text-dim leading-snug antialiased max-w-xs">{item.description}</p>
                    </div>
                  </div>
                );

                if (isToggle) {
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-5 transition-colors",
                        index !== group.items.length - 1 ? 'border-b border-border' : '',
                        isHighContrastEnabled && index !== group.items.length - 1 ? 'border-[#CCFF00]' : ''
                      )}
                    >
                      {content}
                      <button
                        onClick={() => item.onChange?.(!item.value)}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-colors shrink-0 outline-none focus:ring-2 focus:ring-[#D4A843]",
                          item.value 
                            ? (isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-[#D4A843]") 
                            : "bg-surface-3",
                          isHighContrastEnabled && "border-2"
                        )}
                        aria-label={`Toggle ${item.label}`}
                        aria-checked={item.value}
                        role="switch"
                      >
                        <motion.div
                          animate={{ x: item.value ? 24 : 4 }}
                          className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full",
                            item.value ? "bg-white" : "bg-text-dim"
                          )}
                        />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className={cn(
                      "w-full text-left flex items-center justify-between p-5 hover:bg-surface-3 transition-colors group",
                      index !== group.items.length - 1 ? 'border-b border-border' : '',
                      isHighContrastEnabled && index !== group.items.length - 1 ? 'border-[#CCFF00]' : ''
                    )}
                  >
                    {content}
                    <ChevronRight size={16} className={cn("text-text-dim group-hover:text-[#D4A843] transition-colors shrink-0", isHighContrastEnabled && "text-[#CCFF00]")} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Data Destruction Button Container */}
        <section className="pt-4 mb-4">
          <button
            onClick={handleDeleteMyData}
            style={{
              borderColor: '#F05A5A',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
            className={cn(
              "w-full py-4 rounded-xl flex items-center justify-center gap-3 bg-red-950/10 hover:bg-red-900/10 text-[#F05A5A] font-extrabold text-xs uppercase tracking-widest transition-all active:scale-[0.98]",
              isHighContrastEnabled && "bg-black border-4 border-[#F05A5A]"
            )}
            aria-label="Delete My Data. Instant complete wipe out."
            role="button"
          >
            <Trash2 size={16} />
            <span>Delete My Data</span>
          </button>
        </section>
      </div>

      {/* RBA Compliance Global Disclaimer */}
      <GlobalFooter className="mt-8" />

      {/* Terms & Conditions Modal Overlay */}
      <AnimatePresence>
        {showTerms && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[9999]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
          >
            <div className={cn(
              "bg-[#141B22] border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col shadow-2xl space-y-4",
              isHighContrastEnabled && "bg-black border-4 border-[#CCFF00]"
            )}>
              <div className="flex items-center gap-3">
                <FileText className="text-amber-500" size={24} />
                <h3 id="terms-title" className="text-base font-bold text-white">Legal Terms & Disclaimer</h3>
              </div>
              <p className="text-xs text-[#9DB5CC] leading-relaxed antialiased">
                AUDScan is an assisted checking tool only, utilizing visual scanning parameters to perform security check reference templates. 
                <strong> This is not a certified official authentication system. </strong> 
                The user accepts complete discretion and liability in note transactions. We are not liable for any transaction errors or missed counter-fitting notes. 
                Always compare notes against Reserve Bank of Australia guidelines.
              </p>
              <button
                onClick={() => setShowTerms(false)}
                className="w-full py-3 bg-[#D4A843] text-black font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-transform"
                aria-label="Close terms dialog"
                role="button"
              >
                Close Terms
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Accessibility Statement Modal Overlay */}
      <AnimatePresence>
        {showAccessStatement && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[9999]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-title"
          >
            <div className={cn(
              "bg-[#141B22] border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col shadow-2xl space-y-4",
              isHighContrastEnabled && "bg-black border-4 border-[#CCFF00]"
            )}>
              <div className="flex items-center gap-3">
                <Accessibility className="text-purple-400" size={24} />
                <h3 id="access-title" className="text-base font-bold text-white">Accessibility Commitment</h3>
              </div>
              <p className="text-xs text-[#9DB5CC] leading-relaxed antialiased">
                AUDScan is engineered to align with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards to ensure reliable verification for low-vision, blind, and neurodivergent operators. We employ high-contrast visuals, screen reader friendly layouts, haptic warnings, and spoken step-by-step guidance.
              </p>
              <button
                onClick={() => setShowAccessStatement(false)}
                className="w-full py-3 bg-[#D4A843] text-black font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-transform"
                aria-label="Close accessibility commitment dialog"
                role="button"
              >
                Close Statement
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
