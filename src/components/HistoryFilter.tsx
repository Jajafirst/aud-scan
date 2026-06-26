import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';

interface HistoryFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  denominationFilter: string;
  setDenominationFilter: (denom: string) => void;
}

export function HistoryFilter({
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  denominationFilter,
  setDenominationFilter
}: HistoryFilterProps) {
  const { isHighContrastEnabled } = useAccessibility();

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'PASS', label: 'Pass' },
    { id: 'REVIEW', label: 'Review' },
  ];

  const denominations = ['All', '5', '10', '20', '50', '100'];

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search 
          size={18} 
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-text-dim",
            isHighContrastEnabled && "text-white"
          )} 
        />
        <input
          type="text"
          placeholder="Search serial number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "w-full bg-surface-2 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-gold transition-colors",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00] text-white placeholder:text-white/50"
          )}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Filter size={14} className="text-text-dim shrink-0" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                activeFilter === f.id
                  ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black" : "bg-gold text-bg")
                  : (isHighContrastEnabled ? "bg-black border border-[#CCFF00] text-white" : "bg-surface-2 text-text-mid border border-border")
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest shrink-0">Denom:</span>
          {denominations.map((d) => (
            <button
              key={d}
              onClick={() => setDenominationFilter(d)}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                denominationFilter === d
                  ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black" : "bg-gold/20 text-gold border border-gold/30")
                  : (isHighContrastEnabled ? "bg-black border border-white/20 text-white" : "bg-surface-2 text-text-dim border border-border")
              )}
            >
              {d === 'All' ? 'All' : `$${d}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
