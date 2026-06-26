import React from 'react';
import { Camera, Bell, AlertTriangle, ChevronRight, History } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Theme } from '@/src/Theme';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useAlerts } from '@/src/contexts/AlertContext';
import { useHistory } from '@/src/contexts/HistoryContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { GlobalFooter } from '@/src/components/GlobalFooter';

export function HomeScreen() {
  const { isLargeTextEnabled, isHighContrastEnabled } = useAccessibility();
  const { filteredAlerts, unreadCount } = useAlerts();
  const { scans } = useHistory();
  const navigate = useNavigate();

  const latestAlert = filteredAlerts[0];
  const recentScans = scans.slice(0, 5);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex-1 flex flex-col p-6 pt-10",
        isHighContrastEnabled ? "bg-black" : "bg-bg",
        isLargeTextEnabled && "text-lg"
      )}
    >
      {/* Header */}
      <header className="flex justify-between items-start mb-8">
        <div className="flex flex-col">
          <h1 className={cn(
            "text-3xl font-extrabold italic text-gold tracking-tight",
            isHighContrastEnabled && "text-[#CCFF00]",
            isLargeTextEnabled && "text-4xl"
          )}>
            AUDScan
          </h1>
          {/* AI Verification Badge */}
          <div 
            className="self-start flex items-center px-1.5 py-0.5 rounded border select-none"
            style={{
              backgroundColor: 'rgba(212,168,67,0.1)',
              borderColor: 'rgba(212,168,67,0.25)',
              marginTop: '4px'
            }}
          >
            <span 
              className="text-[9px] tracking-wider font-semibold"
              style={{ 
                fontFamily: 'JetBrains Mono, monospace',
                color: '#E5B854'
              }}
            >
              🤖 AI-ASSISTED VERIFICATION
            </span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/alerts')}
          className={cn(
            "p-2.5 bg-surface-2 rounded-full border border-border relative active:scale-90 transition-transform",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
        >
          <Bell size={20} className={cn("text-text-mid", isHighContrastEnabled && "text-[#CCFF00]")} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 w-5 h-5 bg-red rounded-full border-2 border-surface-2 flex items-center justify-center text-[10px] font-black text-white",
              isHighContrastEnabled && "bg-[#CCFF00] text-black border-black"
            )}>
              {unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Alert Banner */}
      {latestAlert && (
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate(`/alerts?id=${latestAlert.id}`)}
          className={cn(
            "bg-red/10 border border-red/30 rounded-2xl p-4 flex gap-4 mb-8 shadow-lg shadow-red/5 cursor-pointer active:scale-[0.98] transition-transform",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
          role="button"
          aria-label={`Warning: ${latestAlert.title}. Source: ${latestAlert.source}`}
        >
          <div className={cn(
            "w-10 h-10 bg-red/20 rounded-xl flex items-center justify-center shrink-0",
            isHighContrastEnabled && "bg-black border border-[#CCFF00]"
          )}>
            <AlertTriangle size={20} className={cn("text-red", isHighContrastEnabled && "text-[#CCFF00]")} />
          </div>
          <div className="flex-1">
            <h3 className={cn(
              "text-xs font-bold text-red uppercase tracking-widest mb-1",
              isHighContrastEnabled && "text-[#CCFF00] font-black text-sm"
            )}>{latestAlert.state} Alert</h3>
            <p className={cn(
              "text-sm text-text-mid leading-snug line-clamp-2",
              isHighContrastEnabled && "text-white font-black text-base"
            )}>
              {latestAlert.title}
            </p>
            {/* Dynamic source metadata */}
            <div 
              style={{
                fontSize: '8px',
                fontWeight: 400,
                color: '#6B8099',
                paddingTop: '4px'
              }}
              className="antialiased"
            >
              Source: {latestAlert.source}
            </div>
          </div>
        </motion.div>
      )}

      {/* Primary Action - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/scan')}
          className={cn(
            "w-full max-w-[240px] aspect-square rounded-[40px] bg-gold flex flex-col items-center justify-center gap-4 shadow-[0_20px_50px_rgba(212,168,67,0.3)] group relative overflow-hidden",
            isHighContrastEnabled && "bg-[#CCFF00] border-8 border-black shadow-[#CCFF00]/20"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className={cn(
            "w-16 h-16 bg-bg/10 rounded-full flex items-center justify-center mb-1",
            isHighContrastEnabled && "bg-black/20"
          )}>
            <Camera size={32} className="text-bg" />
          </div>
          <span className="text-bg font-black text-lg tracking-[0.1em] uppercase">Scan a Note</span>
          <div className="absolute bottom-6 flex items-center gap-2 text-bg/60 text-[10px] font-bold uppercase tracking-widest">
            <span>Start Verification</span>
            <ChevronRight size={12} />
          </div>
        </motion.button>
      </div>

      {/* Recent Scans - Horizontal */}
      <section className="mt-auto">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <History size={14} className={cn("text-text-dim", isHighContrastEnabled && "text-[#CCFF00]")} />
            <h2 className={cn(
              "text-[10px] text-text-dim font-bold tracking-[0.2em] uppercase",
              isHighContrastEnabled && "text-white font-black text-xs"
            )}>Recent Scans</h2>
          </div>
          <button 
            onClick={() => navigate('/settings/history')}
            className={cn(
              "text-[10px] text-gold font-bold uppercase tracking-widest hover:underline",
              isHighContrastEnabled && "text-[#CCFF00] text-xs"
            )}
          >
            View All
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {recentScans.length > 0 ? (
            recentScans.map((scan, index) => (
              <motion.div 
                key={scan.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                onClick={() => navigate('/settings/history', { state: { selectedId: scan.id } })}
                className={cn(
                  "min-w-[140px] p-4 bg-surface-2 rounded-2xl border border-border flex flex-col gap-3 active:bg-surface-3 transition-colors cursor-pointer",
                  isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "w-8 h-8 bg-bg rounded-lg flex items-center justify-center text-sm font-bold text-text-mid",
                    isHighContrastEnabled && "bg-black border border-[#CCFF00] text-[#CCFF00]"
                  )}>
                    ${scan.denomination}
                  </div>
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ 
                      backgroundColor: isHighContrastEnabled ? '#CCFF00' : (scan.verdict === 'PASS' ? Theme.colors.green : Theme.colors.red), 
                      boxShadow: `0 0 10px ${isHighContrastEnabled ? '#CCFF00' : (scan.verdict === 'PASS' ? Theme.colors.green : Theme.colors.red)}` 
                    }} 
                  />
                </div>
                <div>
                  <div className={cn(
                    "text-[10px] text-text-dim font-mono uppercase mb-1",
                    isHighContrastEnabled && "text-white font-black"
                  )}>
                    {formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    scan.verdict === 'PASS' ? "text-green" : "text-amber",
                    isHighContrastEnabled && "text-[#CCFF00] font-black text-xs"
                  )}>
                    {scan.verdict}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center w-full py-8 opacity-30">
              <History size={32} className="mb-2" />
              <span className="text-[10px] uppercase tracking-widest font-bold">No Scans Yet</span>
            </div>
          )}
        </div>
      </section>
      <GlobalFooter className="mt-8" />
    </motion.div>
  );
}
