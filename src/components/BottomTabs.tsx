import React from 'react';
import { Home, Camera, BookOpen, Settings, Bell } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Theme } from '@/src/Theme';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useAlerts } from '@/src/contexts/AlertContext';

const tabs = [
  { id: 'home', label: 'HOME', icon: Home, path: '/' },
  { id: 'scan', label: 'SCAN', icon: Camera, path: '/scan' },
  { id: 'alerts', label: 'ALERTS', icon: Bell, path: '/alerts' },
  { id: 'guide', label: 'GUIDE', icon: BookOpen, path: '/guide' },
  { id: 'settings', label: 'MORE', icon: Settings, path: '/settings' },
];

export function BottomTabs() {
  const location = useLocation();
  const { isHighContrastEnabled, isLargeTextEnabled } = useAccessibility();
  const { unreadCount } = useAlerts();

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 border-t px-4 pb-6 pt-2 z-50",
      isHighContrastEnabled ? "bg-black border-[#CCFF00]" : "bg-surface border-border"
    )}>
      <div className="max-w-md mx-auto flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.id === 'settings' && location.pathname.startsWith('/settings'));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className="flex flex-col items-center gap-1 relative group"
            >
              <div className="relative">
                <Icon
                  size={isLargeTextEnabled ? 24 : 20}
                  className={cn(
                    "transition-all duration-300",
                    isActive 
                      ? (isHighContrastEnabled ? "text-[#CCFF00]" : "text-gold") 
                      : (isHighContrastEnabled ? "text-white" : "text-text-mid group-hover:text-white")
                  )}
                  style={isActive && !isHighContrastEnabled ? { filter: `drop-shadow(0 0 4px ${Theme.colors.gold})` } : {}}
                />
                {tab.id === 'alerts' && unreadCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 bg-red rounded-full border border-surface flex items-center justify-center text-[8px] font-black text-white",
                    isHighContrastEnabled && "bg-[#CCFF00] text-black border-black"
                  )}>
                    {unreadCount}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={cn(
                      "absolute -inset-2 rounded-full -z-10",
                      isHighContrastEnabled ? "bg-[#CCFF00]/20" : "bg-gold/10"
                    )}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-mono tracking-wider transition-colors duration-300",
                  isActive 
                    ? (isHighContrastEnabled ? "text-[#CCFF00] font-black" : "text-gold font-bold") 
                    : (isHighContrastEnabled ? "text-white" : "text-text-mid group-hover:text-white"),
                  isLargeTextEnabled && "text-xs"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
