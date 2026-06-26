import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Clock,
  User,
  Hash
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useHistory, ScanRecord } from '@/src/contexts/HistoryContext';
import { HistoryFilter } from '@/src/components/HistoryFilter';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Camera } from 'lucide-react';

export function ScanHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const { scans, clearHistory, isBusinessAccount } = useHistory();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, PASS, REVIEW
  const [denominationFilter, setDenominationFilter] = useState('All');
  
  // Get selectedId from location state (passed from HomeScreen)
  const [expandedId, setExpandedId] = useState<string | null>(location.state?.selectedId || null);

  // Auto-scroll to top if an item is selected from home
  useEffect(() => {
    if (location.state?.selectedId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state?.selectedId]);

  const filteredScans = useMemo(() => {
    let result = scans.filter(scan => {
      const matchesSearch = scan.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery;
      const matchesVerdict = activeFilter === 'all' || scan.verdict === activeFilter;
      const matchesDenom = denominationFilter === 'All' || scan.denomination.toString() === denominationFilter;
      return matchesSearch && matchesVerdict && matchesDenom;
    });

    // If we have a selectedId, ensure it's at the top if it matches filters
    if (location.state?.selectedId) {
      const selectedIndex = result.findIndex(s => s.id === location.state.selectedId);
      if (selectedIndex > 0) {
        const selected = result.splice(selectedIndex, 1)[0];
        result.unshift(selected);
      }
    }

    return result;
  }, [scans, searchQuery, activeFilter, denominationFilter, location.state?.selectedId]);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all scan history? This action cannot be undone.')) {
      clearHistory();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex-1 flex flex-col p-6 pt-10 min-h-screen pb-24",
        isHighContrastEnabled ? "bg-black" : "bg-bg",
        isLargeTextEnabled && "text-lg"
      )}
    >
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className={cn(
              "p-2 bg-surface-2 rounded-full border border-border active:scale-90 transition-transform",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
            )}
          >
            <ChevronLeft size={20} className={cn("text-white", isHighContrastEnabled && "text-[#CCFF00]")} />
          </button>
          <h1 className={cn(
            "text-2xl font-black tracking-tight text-white",
            isHighContrastEnabled && "text-[#CCFF00]"
          )}>Scan History</h1>
        </div>
        {scans.length > 0 && (
          <button 
            onClick={handleClear}
            className={cn(
              "p-2 text-text-dim hover:text-red transition-colors",
              isHighContrastEnabled && "text-[#CCFF00]"
            )}
            title="Clear All"
          >
            <Trash2 size={20} />
          </button>
        )}
      </header>

      <HistoryFilter 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        denominationFilter={denominationFilter}
        setDenominationFilter={setDenominationFilter}
      />

      {/* Scans List */}
      <div className="flex-1 space-y-4">
        {filteredScans.length > 0 ? (
          filteredScans.map((scan) => (
            <HistoryItem 
              key={scan.id} 
              scan={scan} 
              isExpanded={expandedId === scan.id}
              onToggle={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
              isBusinessAccount={isBusinessAccount}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <Clock size={48} className="text-text-dim mb-4" />
            <p className="text-sm text-text-dim">No matching scans found.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HistoryItem({ 
  scan, 
  isExpanded, 
  onToggle,
  isBusinessAccount
}: { 
  scan: ScanRecord; 
  isExpanded: boolean; 
  onToggle: () => void;
  isBusinessAccount: boolean;
  key?: React.Key;
}) {
  const { isHighContrastEnabled } = useAccessibility();
  const isPass = scan.verdict === 'PASS';

  return (
    <div className={cn(
      "bg-surface-2 rounded-2xl border border-border overflow-hidden transition-all",
      isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]",
      isExpanded && "ring-1 ring-gold/30"
    )}>
      <button 
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4">
          {/* Denomination Badge */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm",
            isPass 
              ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black" : "bg-green/20 text-green")
              : (isHighContrastEnabled ? "bg-black border-2 border-[#CCFF00] text-[#CCFF00]" : "bg-amber/20 text-amber")
          )}>
            ${scan.denomination}
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-sm font-bold text-white",
                isHighContrastEnabled && "text-white"
              )}>
                {isPass ? 'PASS — Features Detected' : 'Review Required'}
              </span>
              <span className="text-[10px] text-text-dim font-mono">
                {formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-text-dim">
              <Hash size={10} />
              <span className="text-[10px] font-mono tracking-wider">
                {scan.serialNumber || 'SN_NOT_DETECTED'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-text-dim">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-black/20"
          >
            <div className="p-4 space-y-4">
              {/* Note Details */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-surface-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Hash size={12} className="text-gold" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-text-dim uppercase font-bold">Serial Number</span>
                    <span className="text-xs text-white font-mono">{scan.serialNumber || 'NOT DETECTED'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-gold" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-text-dim uppercase font-bold">Series</span>
                    <span className="text-xs text-white font-mono">Polymer Series</span>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              {isBusinessAccount && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-surface-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-gold" />
                    <div className="flex flex-col">
                      <span className="text-[8px] text-text-dim uppercase font-bold">Staff ID</span>
                      <span className="text-xs text-white font-mono">{scan.staffId || 'ST-042'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash size={12} className="text-gold" />
                    <div className="flex flex-col">
                      <span className="text-[8px] text-text-dim uppercase font-bold">Till No.</span>
                      <span className="text-xs text-white font-mono">{scan.tillNumber || 'T-01'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Breakdown */}
              <div>
                <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-3">Feature Breakdown</h4>
                <div className="grid grid-cols-1 gap-2">
                  {scan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-surface-3 rounded-lg">
                      <span className="text-xs text-text-mid">{feature.name}</span>
                      {feature.passed ? (
                        <CheckCircle2 size={14} className="text-green" />
                      ) : (
                        <ShieldAlert size={14} className="text-amber" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Forensic Evidence (Image & Suburb) */}
              {!isPass && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Forensic Evidence</h4>
                  <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-surface-3">
                    {scan.image ? (
                      <img src={scan.image} alt="Forensic Evidence" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-dim">
                        <Camera size={24} />
                      </div>
                    )}
                    {scan.suburb && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md flex items-center gap-1">
                        <MapPin size={10} className="text-gold" />
                        <span className="text-[9px] text-white font-bold">{scan.suburb}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action - Only for REVIEW required notes */}
              {!isPass && (
                <button 
                  onClick={() => alert(`Generating police report for serial ${scan.serialNumber} at ${scan.suburb}...`)}
                  className={cn(
                    "w-full py-3 bg-amber text-white font-black rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform",
                    isHighContrastEnabled && "bg-[#CCFF00] text-black border-2 border-black"
                  )}
                >
                  <FileText size={14} />
                  Report to Police
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
