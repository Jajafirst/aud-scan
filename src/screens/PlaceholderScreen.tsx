import React from 'react';
import { motion } from 'motion/react';

export function PlaceholderScreen({ name }: { name: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-20 h-20 bg-surface-2 rounded-3xl flex items-center justify-center mb-4 border border-border">
        <span className="text-3xl">🏗️</span>
      </div>
      <h1 className="text-xl font-bold mb-2 uppercase tracking-widest">{name} Screen</h1>
      <p className="text-sm text-text-dim leading-relaxed">
        This screen is currently under development as part of the Phase 1 MVP roadmap.
      </p>
    </motion.div>
  );
}
