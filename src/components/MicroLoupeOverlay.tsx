import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { Search } from 'lucide-react';

interface MicroLoupeOverlayProps {
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  targetPoint: { x: number; y: number }; // Normalized 0-1
  isProcessing: boolean;
  statusText?: string;
}

export function MicroLoupeOverlay({ 
  isActive, 
  videoRef, 
  targetPoint, 
  isProcessing,
  statusText 
}: MicroLoupeOverlayProps) {
  const { isHighContrastEnabled } = useAccessibility();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    const drawZoom = () => {
      if (!ctx || !video) return;

      const zoomFactor = 5;
      const loupeSize = canvas.width;
      
      // Calculate source coordinates based on targetPoint
      const sw = video.videoWidth / zoomFactor;
      const sh = video.videoHeight / zoomFactor;
      const sx = (targetPoint.x * video.videoWidth) - (sw / 2);
      const sy = (targetPoint.y * video.videoHeight) - (sh / 2);

      ctx.clearRect(0, 0, loupeSize, loupeSize);
      
      // Draw circular clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(loupeSize / 2, loupeSize / 2, loupeSize / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw zoomed video frame
      ctx.drawImage(
        video,
        sx, sy, sw, sh,
        0, 0, loupeSize, loupeSize
      );

      // Add a subtle grain/sharpening effect simulation
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
        ctx.fillRect(Math.random() * loupeSize, Math.random() * loupeSize, 1, 1);
      }
      ctx.restore();

      // Draw border
      ctx.strokeStyle = isHighContrastEnabled ? '#CCFF00' : '#D4A843';
      ctx.lineWidth = 4;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(drawZoom);
    };

    drawZoom();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, targetPoint, videoRef, isHighContrastEnabled]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
        >
          {/* Target Reticle */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              "absolute w-12 h-12 border-2 rounded-full",
              isHighContrastEnabled ? "border-[#CCFF00]" : "border-gold"
            )}
            style={{ 
              left: `${targetPoint.x * 100}%`, 
              top: `${targetPoint.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-current rounded-full" />
          </motion.div>

          {/* Loupe PiP */}
          <div className="absolute top-24 right-6 flex flex-col items-center gap-3">
            <div className={cn(
              "relative w-32 h-32 rounded-full overflow-hidden shadow-2xl border-2",
              isHighContrastEnabled ? "border-[#CCFF00] bg-black" : "border-gold bg-bg"
            )}>
              <canvas 
                ref={canvasRef} 
                width={256} 
                height={256} 
                className="w-full h-full"
              />
              
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Search size={24} className="text-white" />
                  </motion.div>
                </motion.div>
              )}
            </div>
            
            <div className={cn(
              "px-3 py-1.5 rounded-full backdrop-blur-md border",
              isHighContrastEnabled ? "bg-black border-[#CCFF00]" : "bg-black/60 border-white/10"
            )}>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isHighContrastEnabled ? "text-[#CCFF00]" : "text-white"
              )}>
                {statusText || '5x Digital Loupe'}
              </span>
            </div>
          </div>

          {/* Scanning Line in Loupe simulation */}
          {isProcessing && (
            <motion.div 
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="absolute top-24 right-6 w-32 h-0.5 bg-gold/50 blur-[2px] pointer-events-none"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
