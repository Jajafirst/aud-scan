import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, MapPin, AlertTriangle, ExternalLink, ChevronRight, Info, Clock, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useAlerts, AustralianState } from '@/src/contexts/AlertContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GlobalFooter } from '@/src/components/GlobalFooter';

// React Native Linking mock for browser environment
const Linking = {
  openURL: (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export interface AlertItem {
  id: string;
  state: AustralianState;
  severity: 'High' | 'Med';
  title: string;
  timestamp: string;
  description: string;
  originatingAgency: string;  // e.g. "NSW Police Force"
  sourceUrl: string;          // e.g. "https://www.police.nsw.gov.au/news"
  lastVerifiedAt: string;     // e.g. "2 hours ago" or "June 2026"
  policeTip?: string;
}

const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const MOCK_ALERT_FEED: AlertItem[] = [
  {
    id: 'feed-2026-vic-01',
    state: 'VIC',
    severity: 'High',
    title: 'Mitchell Shire: Fake Fifty Dollar Notes Detected',
    timestamp: '2026-06-02T10:00:00Z',
    description: 'A cluster of suspect polymer $50 banknotes has been reported around retail venues in the Mitchell Shire region. Notes are printed on low-grade plastic with duplicate serial numbers.',
    originatingAgency: 'Victoria Police',
    sourceUrl: 'https://www.police.vic.gov.au/news',
    lastVerifiedAt: 'June 2026',
    policeTip: 'Examine the transparent window for rough, manually cut borders and verify that the Southern Cross stars are not printed offset.'
  },
  {
    id: 'feed-2026-nsw-01',
    state: 'NSW',
    severity: 'High',
    title: 'Sydney CBD: High-Quality $100 Polymer Counterfeits',
    timestamp: '2026-06-03T01:15:00Z',
    description: 'Sydney city merchants report highly deceptive $100 notes circulating. These feature simulated tactile print on the edges and attempted clear window embossing.',
    originatingAgency: 'NSW Police Force',
    sourceUrl: 'https://www.police.nsw.gov.au/news',
    lastVerifiedAt: '2 hours ago',
    policeTip: 'Scratch the dark ink with your fingernail; genuine notes use raised intaglio print that can be easily felt.'
  },
  {
    id: 'feed-2026-wa-01',
    state: 'WA',
    severity: 'Med',
    title: 'Albany Retail: $20 Bill Discrepancies',
    timestamp: '2026-05-28T09:30:00Z',
    description: 'Local food outlets have flag-noted multiple suspicious $20 bills. Under UV light, the fluorescent serial numbers are completely missing or distorted.',
    originatingAgency: 'Western Australia Police',
    sourceUrl: 'https://www.police.wa.gov.au/news',
    lastVerifiedAt: 'May 2026',
    policeTip: 'Use a compact UV light to verify the glowing "20" digit block on the genuine notes.'
  },
  {
    id: 'feed-2026-sa-01',
    state: 'SA',
    severity: 'High',
    title: 'Adelaide CBD: Incomplete Security Thread Warnings',
    timestamp: '2026-05-20T11:45:00Z',
    description: 'Multiple $50 notes seized by police around the city mall area. The metallic color-shifting strip exhibits no actual motion pattern.',
    originatingAgency: 'South Australia Police',
    sourceUrl: 'https://www.police.sa.gov.au/news',
    lastVerifiedAt: '3 hours ago',
    policeTip: 'The bird on the security stripe of the high-denomination polymer series must move actively as you tip the banknote.'
  },
  {
    id: 'feed-2026-rba-01',
    state: 'ACT',
    severity: 'Med',
    title: 'National: Digital Mockup Patterns Distributed',
    timestamp: '2026-05-15T15:00:00Z',
    description: 'Advisory regarding digital printed materials marketed as film props. These lack any polymer substrate security layers.',
    originatingAgency: 'Reserve Bank of Australia',
    sourceUrl: 'https://www.rba.gov.au/banknotes/',
    lastVerifiedAt: 'June 2026',
    policeTip: 'Physical inspection is your front line defence. Polymer notes display superb flexibility and springs back immediately when crumpled.'
  }
];

export function AlertFeedScreen() {
  const navigate = useNavigate();
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const { homeState, setHomeState, markAsRead } = useAlerts();
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('id');

  const [selectedState, setSelectedState] = useState<AustralianState | 'ALL'>(homeState || 'ALL');

  useEffect(() => {
    // Mark alerts as read on visit to avoid notification badges piling up
    markAsRead();
  }, []);

  // Sync state filter when context homestate changes, if applicable
  useEffect(() => {
    if (homeState) {
      setSelectedState(homeState);
    }
  }, [homeState]);

  const filteredFeed = MOCK_ALERT_FEED.filter(
    item => selectedState === 'ALL' || item.state === selectedState
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ backgroundColor: '#080B0F' }}
      className={cn(
        "flex-1 flex flex-col p-6 pt-10 min-h-screen relative pb-20",
        isHighContrastEnabled && "bg-black",
        isLargeTextEnabled && "text-lg"
      )}
    >
      {/* Header Bar */}
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/')}
          className={cn(
            "p-2.5 bg-[#0E1318] rounded-full border border-white/5 active:scale-90 transition-transform",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
          aria-label="Back to home screen"
        >
          <ArrowLeft size={20} className={cn("text-text-mid", isHighContrastEnabled ? "text-[#CCFF00]" : "text-[#E5B854]")} />
        </button>
        <div>
          <h1 className={cn(
            "text-2xl font-black tracking-tight text-white",
            (isHighContrastEnabled || isLargeTextEnabled) && "text-3xl"
          )}>
            Alert Feed
          </h1>
          <p className={cn(
            "text-[10px] text-text-dim font-mono tracking-widest uppercase",
            isHighContrastEnabled && "text-white font-bold"
          )}>
            Independent Verification Stream
          </p>
        </div>
      </header>

      {/* State Filter Rail */}
      <section className={cn(
        "bg-[#0E1318] rounded-3xl border border-white/5 p-5 mb-6 shadow-xl",
        isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className={cn("text-[#E5B854]", isHighContrastEnabled && "text-[#CCFF00]")} />
            <h2 className={cn("text-xs font-bold text-white uppercase tracking-widest", isHighContrastEnabled && "text-white font-black")}>
              Filter Region
            </h2>
          </div>
          {selectedState !== 'ALL' && (
            <button 
              onClick={() => setSelectedState('ALL')}
              className="text-[10px] text-gold font-bold uppercase tracking-wider"
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedState('ALL')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-all",
              selectedState === 'ALL'
                ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black" : "bg-[#E5B854] text-[#080B0F]")
                : (isHighContrastEnabled ? "bg-black border border-[#CCFF00] text-white" : "bg-[#141B22] text-text-mid hover:text-white")
            )}
          >
            ALL
          </button>
          {STATES.map(state => (
            <button
              key={state}
              onClick={() => {
                setSelectedState(state);
                // Optionally update Home State to streamline home dashboard
                setHomeState(state);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-all",
                selectedState === state 
                  ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black" : "bg-[#E5B854] text-[#080B0F]")
                  : (isHighContrastEnabled ? "bg-black border border-[#CCFF00] text-white" : "bg-[#141B22] text-text-mid hover:text-white")
              )}
            >
              {state}
            </button>
          ))}
        </div>
      </section>

      {/* Global List Header explaining feed mechanics */}
      <div className={cn(
        "p-4 rounded-2xl bg-[#0E1318]/50 border border-white/5 mb-6 flex gap-3 items-start",
        isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
      )}>
        <Info size={16} className="text-[#E5B854] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#9DB5CC] leading-relaxed">
          This feed aggregates publicly available safety advisories to assist your physical checks. It is not an automated live police dispatch stream.
        </p>
      </div>

      {/* Feed List Container */}
      <div className="flex-1 space-y-5">
        <AnimatePresence mode="popLayout">
          {filteredFeed.length > 0 ? (
            filteredFeed.map((item, index) => {
              const isHigh = item.severity === 'High';
              const isSpecificHighlight = highlightedId === item.id;
              
              // Custom safety disclosure badge text
              const isCentralBank = item.originatingAgency.toLowerCase().includes('reserve bank');
              const antiPartnershipBadge = isCentralBank 
                ? `Sourced from public central bank advisories` 
                : `Sourced from ${item.originatingAgency} public media releases`;

              const fullContextLabel = `Alert for ${item.title}. ${item.description}. ${antiPartnershipBadge}. Last verified ${item.lastVerifiedAt}. Double tap to view original release.`;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{ backgroundColor: '#141B22', border: '1px solid #1E2A38' }}
                  className={cn(
                    "rounded-[28px] p-5 relative overflow-hidden transition-all duration-300 shadow-xl",
                    isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]",
                    isSpecificHighlight && "ring-2 ring-[#E5B854] scale-[1.01]"
                  )}
                  role="article"
                  aria-label={fullContextLabel}
                >
                  {/* Top Meta info */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                        isHigh 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : "bg-amber-500/10 text-[#E5B854] border border-amber-500/10"
                      )}>
                        {item.severity} Priority
                      </span>

                      {/* State tag */}
                      <span className="text-[9px] font-bold text-[#E5B854] font-mono shrink-0">
                        ({item.state})
                      </span>
                    </div>

                    {/* Timeline "Last Verified" Indicator */}
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-[#708599]" />
                      <span 
                        style={{
                          fontSize: '9px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 500,
                          color: '#708599'
                        }}
                      >
                        Last verified: {item.lastVerifiedAt}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={cn(
                    "text-base font-black text-white mb-2 leading-tight",
                    isHighContrastEnabled && "text-[#CCFF00]"
                  )}>
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-[#9DB5CC] leading-relaxed mb-4">
                    {item.description}
                  </p>

                  {/* Police Tip if available */}
                  {item.policeTip && (
                    <div className={cn(
                      "mb-4 p-3 rounded-xl bg-black/40 border border-white/5 flex gap-2.5",
                      isHighContrastEnabled && "border-[#CCFF00]"
                    )}>
                      <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider block">Discretionary check tip:</span>
                        <p className="text-[11px] text-[#9DB5CC] leading-normal font-medium">{item.policeTip}</p>
                      </div>
                    </div>
                  )}

                  {/* Action row with origin source attribution & button link */}
                  <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    {/* Origin badge citing exact public aggregation */}
                    <div className={cn(
                      "px-3 py-1 bg-white/5 rounded-xl border border-white/5 text-[9px] font-semibold text-text-dim lowercase tracking-wide",
                      isHighContrastEnabled && "border-[#CCFF00] text-white font-bold"
                    )}>
                      <span className="font-bold text-[#9DB5CC] uppercase text-[8px] tracking-wider block mb-0.5">Authentication Disclosure</span>
                      {antiPartnershipBadge}
                    </div>

                    {/* Actionable Link */}
                    <button
                      onClick={() => Linking.openURL(item.sourceUrl)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold transition-all hover:opacity-80 py-1.5 px-3 bg-[#E5B854]/10 rounded-xl border border-[#E5B854]/20",
                        isHighContrastEnabled ? "text-[#CCFF00] border-2 border-[#CCFF00] bg-black" : "text-[#E5B854]"
                      )}
                      aria-label={`View Original Release for ${item.title}`}
                    >
                      <span>View Original Release</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-14 h-14 bg-[#0E1318] border border-white/5 rounded-full flex items-center justify-center mb-4">
                <Bell size={24} className="text-text-dim" />
              </div>
              <p className="text-sm font-bold text-text-mid">No Active Feeds</p>
              <p className="text-xs text-text-dim mt-1 max-w-xs leading-normal">
                No public safety alerts are currently indexed for {selectedState}.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GlobalFooter space-saving layout at the bottom of the feed container */}
      <GlobalFooter className="mt-12" />
    </motion.div>
  );
}
