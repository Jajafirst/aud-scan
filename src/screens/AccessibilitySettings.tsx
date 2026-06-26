import React from 'react';
import { motion } from 'motion/react';
import { 
  Accessibility, 
  Volume2, 
  Smartphone, 
  Type, 
  ArrowLeft, 
  MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { GlobalFooter } from '@/src/components/GlobalFooter';

export function AccessibilitySettings() {
  const navigate = useNavigate();
  const { 
    isHapticsEnabled, setHapticsEnabled,
    isAudioGuidanceEnabled, setAudioGuidanceEnabled,
    isLargeTextEnabled, setLargeTextEnabled,
    isHighContrastEnabled
  } = useAccessibility();

  const [srAnnouncement, setSrAnnouncement] = React.useState('');
  const [showAccessibilityStatement, setShowAccessibilityStatement] = React.useState(false);

  const toggleRows = [
    {
      id: 'haptics',
      label: 'Haptic Verdict',
      description: 'Vibrates three short times when a banknote is found PASS — Features Detected, and vibrates one long time if a note requires review.',
      accessibilityLabel: 'Haptic Verdict',
      accessibilityHint: `Double tap to toggle vibrations for scan outcomes. Currently ${isHapticsEnabled ? 'enabled' : 'disabled'}.`,
      icon: Smartphone,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
      value: isHapticsEnabled,
      onChange: setHapticsEnabled
    },
    {
      id: 'audio',
      label: 'Audio Step-by-Step',
      description: 'Provides spoken descriptions for individual security checks as they occur.',
      accessibilityLabel: 'Audio Step-by-Step',
      accessibilityHint: `Double tap to toggle spoken verification steps. Currently ${isAudioGuidanceEnabled ? 'enabled' : 'disabled'}.`,
      icon: Volume2,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-500',
      value: isAudioGuidanceEnabled,
      onChange: setAudioGuidanceEnabled
    },
    {
      id: 'text',
      label: 'Large Text Mode',
      description: 'Increases the visual font size and view lines across all scanning screens for clearer readability.',
      accessibilityLabel: 'Large Text Mode',
      accessibilityHint: `Double tap to toggle legibility enhancements. Currently ${isLargeTextEnabled ? 'enabled' : 'disabled'}.`,
      icon: Type,
      iconBg: 'bg-gray-500/20',
      iconColor: 'text-gray-400',
      value: isLargeTextEnabled,
      onChange: setLargeTextEnabled
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex-1 flex flex-col min-h-screen bg-[#0A0F14] text-white p-6",
        isLargeTextEnabled && "text-lg"
      )}
    >
      {/* Hidden ARIA Live Announcer Region */}
      <div 
        className="sr-only" 
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: '0'
        }}
        aria-live="polite"
      >
        {srAnnouncement}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Back to settings menu"
          >
            <ArrowLeft size={24} />
          </button>
          <span className="text-lg font-medium">9:44</span>
        </div>
        <button className="p-2" aria-hidden="true">
          <MoreHorizontal size={24} />
        </button>
      </header>

      <h1 className={cn(
        "text-3xl font-bold mb-8",
        isLargeTextEnabled && "text-4xl"
      )}>Accessibility</h1>

      {/* Hero Card */}
      <div className="bg-[#141B22] rounded-[32px] p-8 mb-6 border border-white/5">
        <div className="flex gap-6 mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Accessibility size={40} className="text-white" />
          </div>
          <div className="space-y-2">
            <h2 className={cn(
              "text-xl font-bold leading-tight",
              isLargeTextEnabled && "text-2xl"
            )}>Audio Verification Mode</h2>
            <p 
              className="antialiased"
              style={{
                fontSize: '10px',
                fontWeight: 400,
                lineHeight: '14px',
                color: '#9DB5CC'
              }}
            >
              Reads aloud real-time instructions during note scanning.
            </p>
          </div>
        </div>
      </div>

      {/* Start Audio Scan Button */}
      <button 
        onClick={() => navigate('/scan', { state: { audioMode: true } })}
        className={cn(
          "w-full bg-[#D4A843] text-black py-5 rounded-2xl font-bold flex items-center justify-center gap-3 mb-10 active:scale-[0.98] transition-transform",
          isLargeTextEnabled && "text-xl py-6"
        )}
        aria-label="Start verification scan with real-time sound prompts"
        role="button"
      >
        <Volume2 size={24} fill="black" />
        <span>Start Audio Scan</span>
      </button>

      {/* Settings List */}
      <div className="space-y-4">
        {toggleRows.map((row) => (
          <div 
            key={row.id}
            className="bg-[#141B22] rounded-[24px] p-5 flex items-center justify-between border border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", row.iconBg)}>
                <row.icon size={24} className={row.iconColor} />
              </div>
              <div className="space-y-1">
                <h3 className={cn(
                  "font-bold text-sm",
                  isLargeTextEnabled && "text-lg"
                )}>{row.label}</h3>
                <p 
                  className="antialiased"
                  style={{
                    fontSize: '10px',
                    fontWeight: 400,
                    lineHeight: '14px',
                    color: '#9DB5CC'
                  }}
                >
                  {row.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const newValue = !row.value;
                row.onChange(newValue);
                setSrAnnouncement(`${row.label} is now ${newValue ? 'enabled' : 'disabled'}.`);
              }}
              className={cn(
                "w-14 h-8 rounded-full relative transition-colors duration-200",
                row.value ? "bg-[#D4A843]" : "bg-gray-700",
                isHighContrastEnabled && (row.value ? "bg-[#CCFF00] border-2 border-black" : "bg-black border-2 border-white")
              )}
              aria-label={`Toggle ${row.label}`}
              aria-checked={row.value}
              role="switch"
            >
              <motion.div
                animate={{ x: row.value ? 26 : 4 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>
        ))}
      </div>

      {/* Accessibility Statement Link */}
      <div className="flex justify-center mt-12 mb-4">
        <button
          onClick={() => setShowAccessibilityStatement(true)}
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#E5B854',
            textDecoration: 'underline'
          }}
          className="hover:opacity-80 transition-opacity uppercase tracking-wider"
          aria-label="Read Accessibility Statement. Opens a compliance declaration detail."
          role="link"
        >
          Accessibility Statement
        </button>
      </div>

      {/* Bottom Nav Spacer */}
      <div className="h-32" />

      {/* Accessibility Statement Modal / Overlay Backdrop */}
      {showAccessibilityStatement && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[9999]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accessibility-statement-title"
        >
          <div 
            className={cn(
              "bg-[#141B22] border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col items-center text-center shadow-2xl space-y-4 animate-fade-in",
              isHighContrastEnabled && "bg-black border-4 border-[#CCFF00]"
            )}
            style={{
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div className="w-12 h-12 bg-amber-500/12 rounded-full flex items-center justify-center text-[#D4A843] mb-2">
              <Accessibility size={28} />
            </div>
            
            <h2 
              id="accessibility-statement-title"
              className={cn(
                "text-lg font-bold text-white",
                isLargeTextEnabled && "text-xl",
                isHighContrastEnabled && "text-[#CCFF00]"
              )}
            >
              Accessibility Statement
            </h2>
            
            <p 
              className={cn(
                "text-xs leading-relaxed text-[#9DB5CC] font-medium",
                isLargeTextEnabled && "text-sm leading-normal"
              )}
            >
              AUDScan is engineered to align with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards to ensure reliable verification for low-vision, blind, and neurodivergent operators.
            </p>
            
            <button
              onClick={() => setShowAccessibilityStatement(false)}
              className={cn(
                "w-full py-3 mt-4 bg-[#D4A843] text-black font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-transform",
                isHighContrastEnabled && "bg-[#CCFF00] text-black text-sm border-2 border-black"
              )}
              aria-label="Close statement screen"
              role="button"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <GlobalFooter className="mt-8 mb-4" />
    </motion.div>
  );
}
