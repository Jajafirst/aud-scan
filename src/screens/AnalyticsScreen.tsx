import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  ArrowLeft, 
  Clock, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Briefcase, 
  Calendar, 
  Download, 
  Trash2, 
  Info,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useHistory } from '@/src/contexts/HistoryContext';
import { useNavigate } from 'react-router-dom';
import { GlobalFooter } from '@/src/components/GlobalFooter';

export function AnalyticsScreen() {
  const navigate = useNavigate();
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const { scans, clearHistory } = useHistory();
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'tills'>('overview');

  // Multi-day mock trend data
  const trendData = [
    { day: 'Mon', scans: 142, passes: 141, reviews: 1 },
    { day: 'Tue', scans: 185, passes: 183, reviews: 2 },
    { day: 'Wed', scans: 210, passes: 209, reviews: 1 },
    { day: 'Thu', scans: 195, passes: 193, reviews: 2 },
    { day: 'Fri', scans: 245, passes: 241, reviews: 4 },
    { day: 'Sat', scans: 168, passes: 168, reviews: 0 },
    { day: 'Sun', scans: 103, passes: 103, reviews: 0 },
  ];

  // Denomination distribution metrics
  const denominationData = [
    { label: '$100 Notes', count: 320, color: 'bg-green-500/80', hContrastBg: 'bg-white' },
    { label: '$50 Notes', count: 580, color: 'bg-amber-500/80', hContrastBg: 'bg-white' },
    { label: '$20 Notes', count: 210, color: 'bg-red-500/80', hContrastBg: 'bg-white' },
    { label: '$10 Notes', count: 90, color: 'bg-blue-500/80', hContrastBg: 'bg-white' },
    { label: '$5 Notes', count: 48, color: 'bg-purple-500/80', hContrastBg: 'bg-white' },
  ];

  // Till point statistics
  const tillData = [
    { till: 'Register 01 (Front)', scans: 482, suspect: 4, operator: 'Staff #102' },
    { till: 'Register 02 (Main)', scans: 512, suspect: 5, operator: 'Staff #104' },
    { till: 'Register 03 (Express)', scans: 198, suspect: 1, operator: 'Staff #108' },
    { till: 'Self-Serve Lane B', scans: 56, suspect: 0, operator: 'Auto-Auditor' },
  ];

  // Handler for mock report download
  const handleExportCSV = () => {
    alert("Exporting CSV audit logs for the current rolling 90-day cycle. Your report is encrypted and downloaded to on-device memory.");
  };

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
      {/* Header Block */}
      <header className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => navigate('/settings')}
          className={cn(
            "p-2.5 bg-[#0E1318] rounded-full border border-white/5 active:scale-90 transition-transform",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
          aria-label="Back to settings hub"
        >
          <ArrowLeft size={20} className={cn("text-text-mid", isHighContrastEnabled ? "text-[#CCFF00]" : "text-[#E5B854]")} />
        </button>
        <div>
          <h1 className={cn(
            "text-2xl font-black tracking-tight text-white",
            (isHighContrastEnabled || isLargeTextEnabled) && "text-3xl"
          )}>
            Audit Analytics
          </h1>
          <p className={cn(
            "text-[10px] text-text-dim font-mono tracking-widest uppercase",
            isHighContrastEnabled && "text-white font-bold"
          )}>
            Merchant Operations Stream
          </p>
        </div>
      </header>

      {/* Data Retention Policy Banner */}
      <div 
        role="text"
        aria-label="Important Scan analytics retention notice: Scan analytics are retained for 90 days."
        className={cn(
          "mb-6 p-3.5 px-4 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden",
          "bg-[#141B22] border border-[#1E2A38]",
          isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
        )}
      >
        <div className="flex items-center gap-2.5">
          <Clock size={14} className={cn("text-[#E5B854]", isHighContrastEnabled && "text-[#CCFF00]")} />
          <span 
            className="antialiased select-none uppercase tracking-wider"
            style={{
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 500,
              color: '#E5B854'
            }}
          >
            Scan analytics are retained for 90 days.
          </span>
        </div>
        
        <div className={cn(
          "px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-black uppercase text-[#E5B854]",
          isHighContrastEnabled && "border-[#CCFF00] text-white"
        )}>
          90d rolling
        </div>
      </div>

      {/* Interactive Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex-1 py-3 px-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border",
            activeTab === 'overview'
              ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black border-black font-black" : "bg-[#E5B854] text-[#080B0F] border-transparent")
              : (isHighContrastEnabled ? "bg-black text-white border-[#CCFF00]" : "bg-[#0E1318] text-text-mid border-white/5")
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={cn(
            "flex-1 py-3 px-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border",
            activeTab === 'trends'
              ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black border-black font-black" : "bg-[#E5B854] text-[#080B0F] border-transparent")
              : (isHighContrastEnabled ? "bg-black text-white border-[#CCFF00]" : "bg-[#0E1318] text-text-mid border-white/5")
          )}
        >
          Volume Trends
        </button>
        <button
          onClick={() => setActiveTab('tills')}
          className={cn(
            "flex-1 py-3 px-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border",
            activeTab === 'tills'
              ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black border-black font-black" : "bg-[#E5B854] text-[#080B0F] border-transparent")
              : (isHighContrastEnabled ? "bg-black text-white border-[#CCFF00]" : "bg-[#0E1318] text-text-mid border-white/5")
          )}
        >
          Register Hub
        </button>
      </div>

      {/* Primary Content Panes */}
      <div className="flex-1 space-y-6">
        
        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3.5">
              
              {/* Card 1: Total Scans */}
              <div className={cn(
                "p-4 bg-[#0E1318] border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl min-h-[105px]",
                isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
              )}>
                <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider block">Total Scans</span>
                <span className={cn(
                  "text-2xl font-black text-white block mt-2",
                  isHighContrastEnabled && "text-[#CCFF00]"
                )}>
                  1,248
                </span>
                <span className="text-[8px] font-mono text-emerald-400 mt-1 block">
                  ↑ 12% vs last cycle
                </span>
              </div>

              {/* Card 2: Pass Rate */}
              <div className={cn(
                "p-4 bg-[#0E1318] border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl min-h-[105px]",
                isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
              )}>
                <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider block">Pass Rate</span>
                <span className={cn(
                  "text-2xl font-black text-white block mt-2",
                  isHighContrastEnabled && "text-[#CCFF00]"
                )}>
                  99.2%
                </span>
                <span className="text-[8px] font-mono text-emerald-400 mt-1 block">
                  Steady tolerance
                </span>
              </div>

              {/* Card 3: Review Flags */}
              <div className={cn(
                "p-4 bg-[#0E1318] border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl min-h-[105px]",
                isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
              )}>
                <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider block">Review Flags</span>
                <span className={cn(
                  "text-2xl font-black text-white block mt-2",
                  isHighContrastEnabled && "text-red-400"
                )}>
                  10
                </span>
                <span className="text-[8px] font-mono text-red-400 mt-1 block">
                  7 confirmed counterfeit
                </span>
              </div>

            </div>

            {/* Subtitle Reminder */}
            <p 
              className="text-left font-mono tracking-wider antialiased"
              style={{
                fontSize: '9px',
                color: '#708599'
              }}
            >
              Data window reflects the rolling 90-day retention cache.
            </p>

            {/* Denomination Volume Distribution Card */}
            <div className={cn(
              "p-5 bg-[#0E1318] border border-white/5 rounded-3xl shadow-xl",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
            )}>
              <div className="flex items-center gap-2.5 mb-5">
                <Layers size={16} className={cn("text-[#E5B854]", isHighContrastEnabled && "text-[#CCFF00]")} />
                <h3 className={cn("text-xs font-black text-white uppercase tracking-widest", isHighContrastEnabled && "text-white font-black")}>
                  Denomination Allocation
                </h3>
              </div>
              
              <div className="space-y-4">
                {denominationData.map((item) => {
                  const percentage = (item.count / 1248) * 100;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-white">{item.label}</span>
                        <span className="text-text-dim font-mono">{item.count} scans ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isHighContrastEnabled ? "bg-[#CCFF00]" : item.color
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Local Storage History Mirror */}
            {scans.length > 0 && (
              <div className={cn(
                "p-5 bg-[#0E1318]/40 border border-white/5 rounded-3xl",
                isHighContrastEnabled && "border-2 border-[#CCFF00]"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Local Account Data Integration</span>
                  <span className="text-[9px] font-mono text-text-dim">{scans.length} verified locally</span>
                </div>
                <p className="text-[11px] text-text-dim leading-relaxed">
                  Your device currently holds {scans.length} active physical scans. They are compiled into this local reporting panel without network synchronization.
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate('/settings/history')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border text-center text-white border-white/10 active:scale-95 transition-transform",
                      isHighContrastEnabled && "border-[#CCFF00] text-[#CCFF00]"
                    )}
                  >
                    Manage Scan List
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Visual Volume Trends */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            
            {/* Trend Summary Statement */}
            <div className={cn(
              "p-5 bg-[#0E1318] border border-white/5 rounded-3xl shadow-xl",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className={cn("text-[#E5B854]", isHighContrastEnabled && "text-[#CCFF00]")} />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Weekly Scan Counts</h3>
              </div>
              
              {/* Pure SVG Animated Graph for stunning fidelity in both mobile and desktop sizes */}
              <div className="w-full h-44 bg-black/40 rounded-2xl border border-white/5 relative p-4 flex flex-col justify-between overflow-hidden">
                <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />
                
                {/* Horizontal gridlines */}
                <div className="absolute inset-x-0 top-1/4 border-b border-white/5" />
                <div className="absolute inset-x-0 top-2/4 border-b border-white/5" />
                <div className="absolute inset-x-0 top-3/4 border-b border-white/5" />

                {/* SVG Visual line representation */}
                <svg className="w-full h-32 overflow-visible" viewBox="0 0 350 120" preserveAspectRatio="none">
                  {/* Decorative Area Gradient background */}
                  <defs>
                    <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Fill area */}
                  <path 
                    d="M 10 120 L 10 70 L 65 50 L 120 40 L 175 48 L 230 25 L 285 58 L 340 90 L 340 120 Z" 
                    fill="url(#area-grad)" 
                    className="transition-all duration-300"
                  />
                  
                  {/* Line path */}
                  <path 
                    d="M 10 70 L 65 50 L 120 40 L 175 48 L 230 25 L 285 58 L 340 90" 
                    fill="none" 
                    stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} 
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />

                  {/* Draw anchor circles */}
                  <circle cx="10" cy="70" r="5" fill="#080B0F" stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} strokeWidth="2" />
                  <circle cx="65" cy="50" r="5" fill="#080B0F" stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} strokeWidth="2" />
                  <circle cx="120" cy="40" r="5" fill="#080B0F" stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} strokeWidth="2" />
                  <circle cx="175" cy="48" r="5" fill="#080B0F" stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} strokeWidth="2" />
                  <circle cx="230" cy="25" r="5" fill="#080B0F" stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} strokeWidth="2" />
                  <circle cx="285" cy="58" r="5" fill="#080B0F" stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} strokeWidth="2" />
                  <circle cx="340" cy="90" r="5" fill="#080B0F" stroke={isHighContrastEnabled ? '#CCFF00' : '#E5B854'} strokeWidth="2" />
                </svg>

                {/* Day indices */}
                <div className="flex justify-between text-[8px] font-mono font-bold text-text-dim px-2">
                  <span>MON (142)</span>
                  <span>TUE (185)</span>
                  <span>WED (210)</span>
                  <span>THU (195)</span>
                  <span>FRI (245)</span>
                  <span>SAT (168)</span>
                  <span>SUN (103)</span>
                </div>
              </div>

              {/* Subtitle Reminder */}
              <p 
                className="text-left font-mono tracking-wider mt-4 antialiased"
                style={{
                  fontSize: '9px',
                  color: '#708599'
                }}
              >
                Data window reflects the rolling 90-day retention cache.
              </p>
            </div>

            {/* Threat Mitigation Diagnostics */}
            <div className={cn(
              "p-5 bg-[#0E1318] border border-white/5 rounded-3xl",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={15} className="text-red" />
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Mitigated Counterfeiting Impact</h4>
              </div>
              <p className="text-xs text-text-dim leading-relaxed">
                Applying on-device template algorithms, our physical verification flows flagged 10 suspicious notes before acceptance, preventing a simulated liability exposure value of up to <strong className="text-white">$750 AUD</strong> in this rolling window.
              </p>
            </div>

          </div>
        )}

        {/* Tab 3: Register / Till Diagnostics */}
        {activeTab === 'tills' && (
          <div className="space-y-6">
            
            {/* List of active register audit streams */}
            <div className={cn(
              "p-5 bg-[#0E1318] border border-white/5 rounded-3xl shadow-xl",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={16} className={cn("text-[#E5B854]", isHighContrastEnabled && "text-[#CCFF00]")} />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Register Point Checks</h3>
              </div>
              
              <div className="space-y-3.5">
                {tillData.map((reg) => (
                  <div 
                    key={reg.till}
                    className="p-3.5 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white block">{reg.till}</span>
                      <span className="text-[9px] text-text-dim font-mono block">Operator: {reg.operator}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-white block">{reg.scans} checks</span>
                      {reg.suspect > 0 ? (
                        <span className="text-[9px] font-black uppercase text-red border border-red/20 px-1.5 py-0.5 rounded bg-red/5">
                          {reg.suspect} Review Flags
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase text-green">
                          Secure checked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtitle Reminder */}
              <p 
                className="text-left font-mono tracking-wider mt-4 antialiased"
                style={{
                  fontSize: '9px',
                  color: '#708599'
                }}
              >
                Data window reflects the rolling 90-day retention cache.
              </p>
            </div>

            {/* Instruction on register integrations */}
            <div className={cn(
              "p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3 items-start",
              isHighContrastEnabled && "border-[#CCFF00]"
            )}>
              <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-dim leading-relaxed">
                Tills or register IDs are assigned relative to custom local templates in settings. Set custom operator limits to monitor active check speed and counterfeit trends.
              </p>
            </div>

          </div>
        )}

        {/* Global CSV Download / Management panel */}
        <div className="space-y-3 pt-2">
          
          <button
            onClick={handleExportCSV}
            className={cn(
              "w-full h-13 rounded-xl flex items-center justify-center gap-2.5 font-bold uppercase text-xs tracking-wider transition-all",
              isHighContrastEnabled ? "bg-black border-2 border-[#CCFF00] text-[#CCFF00] active:scale-95" : "bg-[#1C2530] border border-white/10 text-white hover:bg-white/5"
            )}
            aria-label="Export decrypted CSV audit file"
          >
            <Download size={15} />
            <span>Export CSV Audit File</span>
          </button>

          <button
            onClick={() => {
              const confirmed = window.confirm("Are you absolutely sure you want to delete all cached reporting records? This will purge local tracking metrics.");
              if (confirmed) {
                clearHistory();
                alert("Analytics cache purged successfully.");
              }
            }}
            className={cn(
              "w-full h-13 rounded-xl flex items-center justify-center gap-2.5 font-bold uppercase text-xs tracking-wider transition-all text-red border border-red/20 hover:bg-red-500/5"
            )}
            aria-label="Clear cached reporting values"
          >
            <Trash2 size={15} />
            <span>Clear Analytics Cache</span>
          </button>

        </div>

      </div>

      {/* RBA Compliance Global Disclaimer */}
      <GlobalFooter className="mt-12" />
    </motion.div>
  );
}
