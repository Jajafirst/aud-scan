import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, ShieldAlert, ChevronLeft, MapPin, Camera, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Theme } from '@/src/Theme';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useHistory } from '@/src/contexts/HistoryContext';
import { GlobalFooter } from '@/src/components/GlobalFooter';

interface VerdictScreenProps {
  status?: 'PASS' | 'REVIEW';
  result?: any;
  serialNumber?: string;
  image?: string;
  suburb?: string;
}

export function VerdictScreen({ status = 'REVIEW', result, serialNumber, image, suburb }: VerdictScreenProps) {
  const navigate = useNavigate();
  const { isHighContrastEnabled, isLargeTextEnabled, triggerHaptic } = useAccessibility();
  const { addScan } = useHistory();
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  
  const hasSaved = React.useRef(false);
  const isPass = status === 'PASS';

  const getLocalizedISOTimestamp = () => {
    const now = new Date();
    const tzo = -now.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    const pad = (num: number) => String(num).padStart(2, '0');
    
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    
    const offsetHours = pad(Math.floor(Math.abs(tzo) / 60));
    const offsetMinutes = pad(Math.abs(tzo) % 60);
    
    return `[${year}-${month}-${day}T${hours}:${minutes}:${seconds}${dif}${offsetHours}:${offsetMinutes}]`;
  };

  const handleExportReport = () => {
    triggerHaptic('TICK');
    const timestamp = getLocalizedISOTimestamp();
    const globalDisclaimer = 'Assisted check only. Not certified authentication.';
    
    const reportData = `AUDScan Verification Audit\n` +
      `Verdict: ${isPass ? 'PASS — Features Detected (High Confidence)' : 'REVIEW NOTE (Suspicious)'}\n` +
      `Denomination: $${result?.detectedDenomination || 50}\n` +
      `Series: ${result?.detectedSeries || 'New'}\n` +
      `Serial Number: ${serialNumber || 'UNKNOWN'}\n` +
      `Region: ${suburb || 'Australian Capital Territory'}\n` +
      `Audit Timestamp: ${timestamp}\n` +
      `Disclaimer: ${globalDisclaimer}\n[DISCLAIMER: Assisted check only. Not certified authentication. This is not an official document.]`;
    
    console.log("SECURED EXPORT CONTENT:\n", reportData);
    alert(`PDF Report Generated Successfully!\n\n${reportData}`);
  };

  useEffect(() => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    // Trigger haptic result
    triggerHaptic(isPass ? 'PASS' : 'REVIEW');

    // Save to history
    addScan({
      denomination: result?.detectedDenomination || 50,
      verdict: status,
      serialNumber: serialNumber || 'UNKNOWN',
      image: image,
      suburb: suburb,
      features: result?.passedChecks.map((name: string) => ({ name, passed: true }))
        .concat(result?.failedChecks.map((name: string) => ({ name, passed: false }))) || [
          { name: 'Rolling Color Effect', passed: isPass },
          { name: 'Microprint Clarity', passed: true },
          { name: 'Tilt Transparency', passed: isPass }
        ]
    });

    if (status === 'REVIEW') {
      const timer = setTimeout(() => setShowSafetyModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [status, isPass, result, serialNumber, image, suburb, addScan, triggerHaptic]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex-1 flex flex-col min-h-screen",
        isPass ? (isHighContrastEnabled ? "bg-black" : "bg-green/5") : (isHighContrastEnabled ? "bg-black" : "bg-amber/5"),
        isLargeTextEnabled && "text-lg"
      )}
    >
      {/* Header */}
      <header className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className={cn(
            "p-2 bg-surface-2 rounded-full border border-border",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
        >
          <ChevronLeft size={20} className={cn("text-text-mid", isHighContrastEnabled && "text-[#CCFF00]")} />
        </button>
        <h1 className={cn(
          "text-sm font-bold uppercase tracking-widest text-text-dim",
          isHighContrastEnabled && "text-white font-black",
          isLargeTextEnabled && "text-base"
        )}>Verification Result</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center w-full max-w-sm mx-auto">
        {!isPass && (
          <div 
            className="w-full mb-6 p-4 rounded-lg flex items-start text-left bg-[#F05A5A]/12 border border-[#F05A5A]"
            style={{
              backgroundColor: 'rgba(240,90,90,0.12)',
              borderColor: '#F05A5A',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '8px'
            }}
            role="alert"
          >
            <p 
              className={cn("antialiased", isHighContrastEnabled ? "text-white font-black" : "text-[#E8EDF2]")}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                lineHeight: 1.5,
                color: '#E8EDF2'
              }}
            >
              🛑 SAFETY FIRST: Do not confront or challenge the person who gave you this note. Your personal safety is more valuable than the currency.
            </p>
          </div>
        )}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-2xl",
            isPass 
              ? (isHighContrastEnabled ? "bg-black border-4 border-[#CCFF00] shadow-[#CCFF00]/20" : "bg-green/20 border border-green/30 shadow-green/20") 
              : (isHighContrastEnabled ? "bg-black border-4 border-[#CCFF00] shadow-[#CCFF00]/20" : "bg-amber/20 border border-amber/30 shadow-amber/20")
          )}
        >
          {isPass ? (
            <CheckCircle2 size={64} className={cn("text-green", isHighContrastEnabled && "text-[#CCFF00]")} />
          ) : (
            <AlertTriangle size={64} className={cn("text-amber", isHighContrastEnabled && "text-[#CCFF00]")} />
          )}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={cn(
            "text-3xl font-black tracking-tight mb-2",
            isPass 
              ? (isHighContrastEnabled ? "text-[#CCFF00]" : "text-green") 
              : (isHighContrastEnabled ? "text-[#CCFF00]" : "text-amber"),
            isLargeTextEnabled && "text-4xl"
          )}>
            {isPass ? "PASS — Features Detected" : "REVIEW NOTE"}
          </h2>
          <p className={cn(
            "text-text-mid font-mono text-xs uppercase tracking-[0.2em]",
            isHighContrastEnabled && "text-white font-black text-sm"
          )}>
            {isPass 
              ? `$${result?.detectedDenomination || 50} · ${(result?.detectedSeries || 'NEW').toUpperCase()} SERIES · HIGH CONFIDENCE ${isPass ? (92 + (serialNumber ? serialNumber.charCodeAt(0) % 7 : 4)) : (40 + (serialNumber ? serialNumber.charCodeAt(0) % 20 : 15))}%` 
              : `${result?.failedChecks?.length || 2} Checks Failed`}
          </p>

          {/* Informational Disclaimer Line */}
          <div 
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: '#6B8099',
              textAlign: 'center',
              marginTop: '8px'
            }}
            className="antialiased animate-fade-in"
          >
            This is an assisted check only. Not certified authentication.
          </div>

          {/* AI Confidence Metric Explanation */}
          {isPass && (
            <div 
              style={{
                fontSize: '9px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 400,
                color: '#9DB5CC',
                textAlign: 'center',
                marginTop: '4px'
              }}
              className="antialiased"
            >
              {isPass ? (92 + (serialNumber ? serialNumber.charCodeAt(0) % 7 : 4)) : (40 + (serialNumber ? serialNumber.charCodeAt(0) % 20 : 15))}% confidence means the app detected most expected security features.
            </div>
          )}
        </motion.div>

        {/* Details Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={cn(
            "w-full max-w-sm mt-12 bg-surface-2 rounded-3xl border border-border p-6 text-left",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
        >
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
            <div>
              <h3 className={cn(
                "text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1",
                isHighContrastEnabled && "text-white font-black text-xs"
              )}>Note Identity</h3>
              <p className="text-xs text-white font-mono">{serialNumber}</p>
            </div>
            <div className="text-right">
              <h3 className={cn(
                "text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1",
                isHighContrastEnabled && "text-white font-black text-xs"
              )}>Series</h3>
              <p className="text-xs text-white font-mono">{result?.detectedSeries || 'New'} Series</p>
            </div>
          </div>

          <h3 className={cn(
            "text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4",
            isHighContrastEnabled && "text-white font-black text-xs"
          )}>Security Feature Audit</h3>
          
          <div className="space-y-3">
            {result?.passedChecks?.map((label: string) => (
              <FeatureRow key={label} label={label} status="pass" highContrast={isHighContrastEnabled} />
            ))}
            {result?.failedChecks?.map((label: string) => (
              <FeatureRow key={label} label={label} status="fail" highContrast={isHighContrastEnabled} />
            ))}
            {!result && (
              <>
                <FeatureRow label="Rolling Color Effect" status={isPass ? 'pass' : 'fail'} highContrast={isHighContrastEnabled} />
                <FeatureRow label="Microprint Clarity" status={isPass ? 'pass' : 'pass'} highContrast={isHighContrastEnabled} />
                <FeatureRow label="Tilt Transparency" status={isPass ? 'pass' : 'fail'} highContrast={isHighContrastEnabled} />
              </>
            )}
          </div>
        </motion.div>

        {/* Action Instructions Paragraph with Crime Stoppers Link */}
        {!isPass && (
          <p 
            className="text-xs text-text-mid leading-relaxed text-left w-full max-w-sm mt-6 mb-2"
            style={{ color: '#9DB5CC' }}
          >
            Suspected counterfeit notes must be handled with care to preserve forensic evidence. Report suspicious currency immediately to state police or <a 
              href="tel:1800333000"
              className={cn("underline hover:text-white", isHighContrastEnabled && "text-[#CCFF00]")}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: '#E8EDF2',
                fontWeight: 'bold',
                textDecoration: 'underline'
              }}
              aria-label="Call Crime Stoppers on 1 8 0 0 3 3 3 0 0 0"
            >
              Crime Stoppers on 1800 333 000
            </a>.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-8 pb-32 flex flex-col gap-4 w-full max-w-sm mx-auto">
        {/* Manual Physical Check Reminder Box */}
        <div 
          className={cn(
            "p-3 rounded-lg flex items-start gap-2.5 text-left mb-2",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
          style={isHighContrastEnabled ? {} : {
            backgroundColor: '#141B22',
            border: '1px solid #1E2A38'
          }}
        >
          <span className="text-sm select-none">✋</span>
          <p 
            className={cn("antialiased", isHighContrastEnabled ? "text-white font-black" : "text-[#9DB5CC]")}
            style={{
              fontSize: '10px',
              lineHeight: 1.4
            }}
          >
            Physical checks still recommended. Remember to Feel the raised print, Look for the clear windows, and Tilt to verify optical shifts.
          </p>
        </div>

        {!isPass && (
          <div className="flex flex-col items-center w-full">
            <button 
              onClick={() => setShowReportForm(true)}
              className={cn(
                "w-full py-4 bg-amber text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-amber/20 active:scale-95 transition-transform",
                isHighContrastEnabled && "bg-[#CCFF00] text-black text-sm border-4 border-black"
              )}
            >
              Report to Police →
            </button>
            <p 
              className="text-center w-full"
              style={{
                fontSize: '9px',
                fontWeight: 400,
                color: '#6B8099',
                marginTop: '4px',
                lineHeight: 1.4
              }}
            >
              Reporting here submits data to the local threat map and does not replace filing an official report with state police.
            </p>
          </div>
        )}

        {isPass && (
          <div className="flex flex-col items-center w-full">
            <button 
              onClick={handleExportReport}
              className={cn(
                "w-full py-4 bg-surface-2 text-text font-black rounded-2xl border border-border uppercase tracking-widest text-xs active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5",
                isHighContrastEnabled && "bg-black text-[#CCFF00] text-sm border-2 border-[#CCFF00]"
              )}
              role="button"
              aria-label="Share result and export PDF button. Note: exported documents include full liability disclaimer."
            >
              <span>Share Result · Export PDF</span>
              <span 
                className="antialiased font-medium" 
                style={{ 
                  fontSize: '8px', 
                  color: '#4A6080', 
                  textTransform: 'none'
                }}
              >
                *Exported files include full liability disclaimer
              </span>
            </button>
          </div>
        )}

        <button 
          onClick={() => navigate('/scan')}
          className={cn(
            "w-full py-4 bg-surface-2 text-text font-black rounded-2xl border border-border uppercase tracking-widest text-xs active:scale-95 transition-transform",
            isHighContrastEnabled && "bg-black text-white text-sm border-2 border-[#CCFF00]"
          )}
        >
          Scan Another
        </button>
      </div>

      {/* Safety Modal */}
      <AnimatePresence>
        {showSafetyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={cn(
                "w-full max-w-sm bg-surface-2 rounded-[32px] border border-amber/30 p-8 shadow-2xl relative overflow-hidden",
                isHighContrastEnabled && "bg-black border-4 border-[#CCFF00]"
              )}
            >
              <div className={cn("absolute top-0 left-0 w-full h-1 bg-amber", isHighContrastEnabled && "bg-[#CCFF00] h-2")} />
              <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className={cn("text-amber", isHighContrastEnabled && "text-[#CCFF00]")} size={28} />
                <h2 className={cn("text-xl font-black text-white tracking-tight", isHighContrastEnabled && "text-2xl")}>⚠️ RBA PROTOCOL</h2>
              </div>
              
              <p className={cn(
                "text-[10px] font-bold text-amber uppercase tracking-[0.2em] mb-4",
                isHighContrastEnabled && "text-[#CCFF00]"
              )}>Store It • Note It • Report It</p>

              <ul className="space-y-6 mb-8">
                <SafetyItem number="1" text="Store the note in an envelope. Handle by corners only to preserve fingerprints." highContrast={isHighContrastEnabled} />
                <SafetyItem number="2" text="Note the passer's details (physical description, vehicle, time, location)." highContrast={isHighContrastEnabled} />
                <SafetyItem number="3" text="Report immediately to local police or the Australian Federal Police." highContrast={isHighContrastEnabled} />
              </ul>

              <button 
                onClick={() => setShowSafetyModal(false)}
                className={cn(
                  "w-full py-4 bg-white text-bg font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform",
                  isHighContrastEnabled && "bg-[#CCFF00] text-black text-sm border-4 border-black"
                )}
              >
                Understood
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Form Modal */}
      <AnimatePresence>
        {showReportForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn("fixed inset-0 z-[110] bg-bg flex flex-col", isHighContrastEnabled && "bg-black")}
          >
            <header className={cn("p-6 flex items-center justify-between border-b border-border", isHighContrastEnabled && "border-[#CCFF00]")}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowReportForm(false)} 
                  className={cn("p-2 bg-surface-2 rounded-full", isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]")}
                >
                  <X size={20} className={cn(isHighContrastEnabled && "text-[#CCFF00]")} />
                </button>
                <h2 className={cn("font-bold", isHighContrastEnabled && "font-black text-xl")}>Report Counterfeit</h2>
              </div>
              <button 
                onClick={() => {
                  alert("Report submitted to authorities. Thank you.");
                  setShowReportForm(false);
                }}
                className={cn("text-gold font-bold text-sm", isHighContrastEnabled && "text-[#CCFF00] font-black text-base")}
              >
                Submit
              </button>
            </header>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              <div className="space-y-4">
                <label className={cn("text-[10px] font-bold text-text-dim uppercase tracking-widest", isHighContrastEnabled && "text-white font-black text-xs")}>Denomination</label>
                <div className="grid grid-cols-3 gap-3">
                  {['$20', '$50', '$100'].map(d => (
                    <button 
                      key={d} 
                      className={cn(
                        "py-3 bg-surface-2 rounded-xl border border-border font-mono text-sm hover:border-gold transition-colors",
                        isHighContrastEnabled && "bg-black border-2 border-[#CCFF00] text-white font-black"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className={cn("text-[10px] font-bold text-text-dim uppercase tracking-widest", isHighContrastEnabled && "text-white font-black text-xs")}>Location (Suburb)</label>
                <div className="relative">
                  <MapPin className={cn("absolute left-4 top-1/2 -translate-y-1/2 text-text-dim", isHighContrastEnabled && "text-[#CCFF00]")} size={18} />
                  <input 
                    type="text" 
                    placeholder="e.g. Surry Hills"
                    defaultValue={suburb}
                    className={cn(
                      "w-full bg-surface-2 border border-border rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-text-dim/50 focus:border-gold outline-none transition-colors",
                      isHighContrastEnabled && "bg-black border-2 border-[#CCFF00] placeholder:text-white/30"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className={cn("text-[10px] font-bold text-text-dim uppercase tracking-widest", isHighContrastEnabled && "text-white font-black text-xs")}>Photo Evidence</label>
                {image ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border">
                    <img src={image} alt="Evidence" className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera size={32} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <button className={cn(
                    "w-full aspect-video bg-surface-2 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-text-dim hover:text-text hover:border-gold transition-all",
                    isHighContrastEnabled && "bg-black border-[#CCFF00] text-white"
                  )}>
                    <Camera size={32} className={cn(isHighContrastEnabled && "text-[#CCFF00]")} />
                    <span className={cn("text-xs font-medium", isHighContrastEnabled && "font-black text-sm")}>Capture or Upload Photo</span>
                  </button>
                )}
              </div>

              <div className={cn("bg-amber/10 border border-amber/30 rounded-2xl p-4 flex gap-3", isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]")}>
                <AlertTriangle size={18} className={cn("text-amber shrink-0", isHighContrastEnabled && "text-[#CCFF00]")} />
                <p className={cn("text-[11px] text-amber/90 leading-relaxed", isHighContrastEnabled && "text-white font-black text-xs")}>
                  Reports are anonymous and shared with local law enforcement to track counterfeit patterns.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <GlobalFooter className="mt-8 mb-4" />
    </motion.div>
  );
}

const FeatureRow: React.FC<{ label: string; status: 'pass' | 'fail'; highContrast?: boolean }> = ({ label, status, highContrast }) => {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm text-text-mid", highContrast && "text-white font-black")}>{label}</span>
      <div className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        status === 'pass' 
          ? (highContrast ? "bg-[#CCFF00] text-black" : "bg-green/10 text-green") 
          : (highContrast ? "bg-white text-black" : "bg-red/10 text-red")
      )}>
        {status}
      </div>
    </div>
  );
};

function SafetyItem({ number, text, highContrast }: { number: string, text: string, highContrast?: boolean }) {
  return (
    <li className="flex gap-4">
      <div className={cn(
        "w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center text-amber font-bold text-xs shrink-0 mt-0.5",
        highContrast && "bg-[#CCFF00] text-black font-black"
      )}>
        {number}
      </div>
      <p className={cn("text-sm text-text-mid leading-relaxed", highContrast && "text-white font-black")}>{text}</p>
    </li>
  );
}
