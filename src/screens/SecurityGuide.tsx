import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldCheck, Eye, Zap, Search, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Theme } from '@/src/Theme';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { cn } from '@/src/lib/utils';
import { CURRENCY_DATA, BanknoteData } from '@/src/data/CurrencyData';
import { GlobalFooter } from '@/src/components/GlobalFooter';

export function SecurityGuide() {
  const navigate = useNavigate();
  const { isLargeTextEnabled, isHighContrastEnabled } = useAccessibility();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<'New' | 'Old'>('New');
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    return CURRENCY_DATA.filter(note => {
      const matchesSeries = note.series === selectedSeries;
      const matchesSearch = note.denomination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.features.some(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSeries && matchesSearch;
    });
  }, [searchQuery, selectedSeries]);

  const toggleNote = (denomination: string) => {
    setExpandedNote(expandedNote === denomination ? null : denomination);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex-1 flex flex-col min-h-screen pb-32",
        isHighContrastEnabled ? "bg-black" : "bg-bg",
        isLargeTextEnabled && "text-lg"
      )}
    >
      <header className={cn(
        "p-6 pt-10 sticky top-0 z-20 border-b border-border",
        isHighContrastEnabled ? "bg-black border-[#CCFF00]" : "bg-bg/80 backdrop-blur-md"
      )}>
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className={cn(
              "p-2.5 bg-surface-2 rounded-full border border-border active:scale-90 transition-transform",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
            )}
          >
            <ArrowLeft size={20} className={cn("text-text-mid", isHighContrastEnabled && "text-[#CCFF00]")} />
          </button>
          <h1 className={cn(
            "text-2xl font-black tracking-tight text-white",
            (isHighContrastEnabled || isLargeTextEnabled) && "text-3xl"
          )}>Security Guide</h1>
        </div>

        {/* Central Bank Source Attribution Header & Audit Timeline */}
        <div 
          style={{
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            color: '#E5B854',
            textTransform: 'uppercase',
            paddingBottom: '8px',
            marginBottom: '12px',
            borderBottom: isHighContrastEnabled ? '1px solid #CCFF00' : '1px solid rgba(255,255,255,0.05)'
          }}
          className="antialiased flex items-center flex-wrap gap-x-2"
        >
          <span>Source: Reserve Bank of Australia (RBA)</span>
          <span 
            style={{
              fontSize: '9px',
              fontWeight: 400,
              color: '#6B8099',
              fontStyle: 'italic',
              textTransform: 'none'
            }}
          >
            Last updated: May 2026
          </span>
        </div>

        {/* Series Toggle */}
        <div className={cn(
          "flex p-1 bg-surface-2 rounded-2xl border border-border mb-6",
          isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
        )}>
          {(['New', 'Old'] as const).map((series) => (
            <button
              key={series}
              onClick={() => setSelectedSeries(series)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                selectedSeries === series
                  ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black" : "bg-gold text-bg shadow-lg shadow-gold/20")
                  : (isHighContrastEnabled ? "text-white" : "text-text-dim hover:text-white")
              )}
            >
              {series === 'New' ? 'Next Gen (2016+)' : 'Old Series'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 text-text-dim", isHighContrastEnabled && "text-[#CCFF00]")} size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search security features..."
            className={cn(
              "w-full bg-surface-2 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-text-dim/50 focus:border-gold outline-none transition-colors",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00] placeholder:text-white/30"
            )}
          />
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Legal Tender Status Banner */}
        <div 
          className={cn(
            "p-4 rounded-lg flex items-start gap-3 text-left",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
          style={isHighContrastEnabled ? {} : {
            backgroundColor: '#141B22',
            border: '1px solid #1E2A38',
            borderRadius: '8px'
          }}
          role="text"
          aria-label="Legal Tender Notice: All historical Australian polymer banknotes remain full legal tender."
        >
          <span className="text-sm shrink-0 select-none">⚖️</span>
          <p 
            className={cn("antialiased", isHighContrastEnabled ? "text-white font-black" : "text-[#9DB5CC]")}
            style={{
              fontSize: '10px',
              lineHeight: '14px'
            }}
          >
            <span className="font-bold text-white uppercase tracking-wider text-[9px] mr-1 block sm:inline">Legal Tender Notice:</span>
            All historical Australian polymer banknotes (First Series issued since 1992) <span className="font-bold text-[#E8EDF2]" style={{ fontWeight: 700 }}>remain full legal tender</span> and continue to circulate alongside the New Series.
          </p>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note, index) => (
              <NoteCard 
                key={`${note.series}-${note.denomination}`}
                note={note} 
                index={index}
                isExpanded={expandedNote === note.denomination}
                onToggle={() => toggleNote(note.denomination)}
              />
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-4">
                <Info size={32} className="text-text-dim" />
              </div>
              <p className="text-sm text-text-dim">No results found for "{searchQuery}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <GlobalFooter className="mt-8 mb-4" />
    </motion.div>
  );
}

function NoteCard({ note, index, isExpanded, onToggle }: { note: BanknoteData, index: number, isExpanded: boolean, onToggle: () => void, key?: string }) {
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();

  return (
    <motion.section 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "bg-surface-2 rounded-[32px] border border-border overflow-hidden shadow-xl transition-all",
        isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]",
        isExpanded && "ring-2 ring-gold/20"
      )}
    >
      <button 
        onClick={onToggle}
        className="w-full text-left"
      >
        <div 
          className="h-24 flex items-center justify-between px-8 relative overflow-hidden"
          style={{ backgroundColor: isHighContrastEnabled ? '#000' : `${note.color}15` }}
        >
          <div 
            className="absolute inset-0 opacity-20"
            style={{ 
              backgroundImage: `radial-gradient(circle at 20% 50%, ${isHighContrastEnabled ? '#CCFF00' : note.color} 0%, transparent 50%)` 
            }}
          />
          <span className={cn(
            "text-5xl font-black italic tracking-tighter relative z-10",
            isHighContrastEnabled && "text-[#CCFF00]"
          )} style={{ color: isHighContrastEnabled ? undefined : note.color }}>
            {note.denomination}
          </span>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className={cn(
              "px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10",
              isHighContrastEnabled && "border-[#CCFF00]"
            )}>
              <span className={cn("text-[8px] font-bold text-white uppercase tracking-widest", isHighContrastEnabled && "text-[#CCFF00]")}>
                {note.series} Series
              </span>
            </div>
            {isExpanded ? <ChevronUp size={20} className="text-text-dim" /> : <ChevronDown size={20} className="text-text-dim" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-2 space-y-6">
              <div 
                style={{
                  fontSize: '9px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#E5B854',
                  textTransform: 'uppercase',
                  paddingBottom: '4px',
                  borderBottom: isHighContrastEnabled ? '1px solid #CCFF00' : '1px solid rgba(255,255,255,0.05)',
                  marginBottom: '8px'
                }}
                className="antialiased flex items-center justify-between"
              >
                <span>Source: Reserve Bank of Australia (RBA)</span>
                <span 
                  style={{
                    fontSize: '8px',
                    fontWeight: 400,
                    color: '#6B8099',
                    fontStyle: 'italic',
                    textTransform: 'none'
                  }}
                >
                  Last updated: May 2026
                </span>
              </div>
              <div className="h-px bg-border" />
              
              <div className="space-y-6">
                <h3 className={cn(
                  "text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]",
                  isHighContrastEnabled && "text-white font-black text-xs"
                )}>Security Checklist</h3>
                
                <div className="space-y-6">
                  {note.features.map((feature, fIndex) => (
                    <div key={feature.id} className="space-y-2">
                      <div className="flex gap-3 items-start">
                        <div className={cn(
                          "mt-1 p-1.5 rounded-lg",
                          isHighContrastEnabled ? "bg-[#CCFF00]/10" : "bg-gold/10"
                        )}>
                          {fIndex % 3 === 0 ? <Eye size={14} className={cn("text-gold", isHighContrastEnabled && "text-[#CCFF00]")} /> : 
                           fIndex % 3 === 1 ? <Zap size={14} className={cn("text-gold", isHighContrastEnabled && "text-[#CCFF00]")} /> :
                           <ShieldCheck size={14} className={cn("text-gold", isHighContrastEnabled && "text-[#CCFF00]")} />}
                        </div>
                        <div>
                          <h4 className={cn(
                            "text-sm font-bold text-white",
                            isHighContrastEnabled && "text-[#CCFF00]",
                            isLargeTextEnabled && "text-base"
                          )}>
                            {feature.title}
                          </h4>
                          <p className={cn(
                            "text-xs text-text-mid leading-relaxed mt-1",
                            isHighContrastEnabled && "text-white font-black text-sm",
                            isLargeTextEnabled && "text-sm"
                          )}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "ml-10 p-3 rounded-xl bg-surface-3 border border-border/50",
                        isHighContrastEnabled && "bg-black border-[#CCFF00]"
                      )}>
                        <p className={cn(
                          "text-[10px] font-mono text-gold uppercase tracking-wider mb-1",
                          isHighContrastEnabled && "text-[#CCFF00]"
                        )}>Verification Step:</p>
                        <p className={cn(
                          "text-[11px] text-text-dim leading-relaxed",
                          isHighContrastEnabled && "text-white font-black text-xs"
                        )}>
                          {feature.howToVerify}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-2xl bg-gold/5 border border-gold/20 flex gap-3",
                isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
              )}>
                <Info size={18} className={cn("text-gold shrink-0", isHighContrastEnabled && "text-[#CCFF00]")} />
                <p className={cn(
                  "text-[11px] text-text-mid leading-relaxed",
                  isHighContrastEnabled && "text-white font-black text-xs"
                )}>
                  Always check multiple security features. If you suspect a note is counterfeit, handle it as little as possible and report it.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
