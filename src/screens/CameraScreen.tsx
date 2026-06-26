import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, ZapOff, RefreshCcw, AlertTriangle, CameraOff, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Theme } from '@/src/Theme';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { GlobalFooter } from '@/src/components/GlobalFooter';

import { VerificationEngine, VerificationPlan, VerificationResult } from '@/src/lib/VerificationEngine';
import { SideDetectionLogic, NoteSide } from '@/src/lib/SideDetectionLogic';
import { CameraOverlay } from '@/src/components/CameraOverlay';
import { ChecklistProgress } from '@/src/components/ChecklistProgress';
import { MicroLoupeOverlay } from '@/src/components/MicroLoupeOverlay';
import { captureBurst, applySuperResolution, validateMicroprint, MICROPRINT_ANCHORS } from '@/src/lib/burstCaptureLogic';

export function CameraScreen() {
  const navigate = useNavigate();
  const { isHighContrastEnabled, triggerHaptic } = useAccessibility();
  const videoRef = useRef<HTMLVideoElement>(null);
  const privacyBtnRef = useRef<HTMLButtonElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isLensUnclear, setIsLensUnclear] = useState(false);
  const [orientation, setOrientation] = useState({ pitch: 0, roll: 0 });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Verifying Security Features...');
  const [detectedSide, setDetectedSide] = useState<NoteSide>('FRONT');
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentChecks, setCurrentChecks] = useState<{ label: string; status: 'pending' | 'passed' | 'failed' }[]>([]);
  const [isMicroprintActive, setIsMicroprintActive] = useState(false);
  const [microprintTarget, setMicroprintTarget] = useState({ x: 0.5, y: 0.5 });
  const [isBurstProcessing, setIsBurstProcessing] = useState(false);
  const [microprintStatus, setMicroprintStatus] = useState('5x Digital Loupe');
  const lastMilestone = useRef<number>(0);
  const pulseInterval = useRef<NodeJS.Timeout | null>(null);

  const [hasSeenCameraPrivacyDisclaimer, setHasSeenCameraPrivacyDisclaimer] = useState<boolean>(true);
  const [isLowLightDetected, setIsLowLightDetected] = useState(false);
  const [detectedNoteLabel, setDetectedNoteLabel] = useState<string>('');

  // Checks the persistent privacy compliance state
  useEffect(() => {
    try {
      const val = localStorage.getItem('hasSeenCameraPrivacyDisclaimer');
      if (val !== 'true') {
        setHasSeenCameraPrivacyDisclaimer(false);
      }
    } catch (err) {
      console.error("Local storage lookup failed:", err);
      setHasSeenCameraPrivacyDisclaimer(false);
    }
  }, []);

  const dismissPrivacy = () => {
    try {
      localStorage.setItem('hasSeenCameraPrivacyDisclaimer', 'true');
    } catch (err) {
      console.error("Local storage save failed:", err);
    }
    setHasSeenCameraPrivacyDisclaimer(true);
    triggerHaptic('TICK');
  };

  // Trapping screen reader focus on modal activation
  useEffect(() => {
    if (!hasSeenCameraPrivacyDisclaimer && privacyBtnRef.current) {
      privacyBtnRef.current.focus();
    }
  }, [hasSeenCameraPrivacyDisclaimer]);

  // Exposure & lighting logic: automatically detects dark levels if torch and scanning are inactive
  useEffect(() => {
    if (hasPermission === false || isScanning) {
      setIsLowLightDetected(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!isTorchOn) {
        setIsLowLightDetected(true);
        // Accessibility announcement hook for screen readers
        const speech = window.speechSynthesis;
        if (speech) {
          const utterance = new SpeechSynthesisUtterance('Low light warning: Ensure the note is well lit');
          utterance.rate = 1.0;
          utterance.volume = 0.5; // low sound clip announcement
          speech.speak(utterance);
        }
      } else {
        setIsLowLightDetected(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isTorchOn, hasPermission, isScanning]);

  const engine = VerificationEngine.getInstance();

  // Haptic Orientation Feed: Slow pulse if angle is too steep
  useEffect(() => {
    const isAngleValid = SideDetectionLogic.isAngleValid(orientation.pitch);
    
    if (!isAngleValid && !pulseInterval.current) {
      pulseInterval.current = setInterval(() => {
        triggerHaptic('SLOW_PULSE');
      }, 1000);
    } else if (isAngleValid && pulseInterval.current) {
      clearInterval(pulseInterval.current);
      pulseInterval.current = null;
    }

    return () => {
      if (pulseInterval.current) clearInterval(pulseInterval.current);
    };
  }, [orientation.pitch]);

  // Alignment Haptics: Trigger when banknote is centered
  useEffect(() => {
    // Simulate banknote detection logic
    const checkCentering = () => {
      // In a real app, this would come from a vision model
      // We simulate it based on pitch/roll stability for this demo
      const centered = Math.abs(orientation.roll) < 2 && Math.abs(orientation.pitch - 45) < 5;
      if (centered && !isCentered) {
        triggerHaptic('TICK');
      }
      setIsCentered(centered);
    };

    checkCentering();
  }, [orientation, isCentered]);

  // Tilt Milestone Haptics: 15°, 30°, 45°
  useEffect(() => {
    const pitch = Math.abs(orientation.pitch);
    const milestones = [15, 30, 45];
    
    milestones.forEach(m => {
      if (pitch >= m && lastMilestone.current < m) {
        triggerHaptic('MILESTONE');
        lastMilestone.current = m;
      }
    });

    // Reset milestones if user tilts back significantly
    if (pitch < 5) {
      lastMilestone.current = 0;
    }
  }, [orientation.pitch]);

  // Placeholder for frame analysis
  const detectRollingEffect = (frameData: any) => {
    // Returns a simulated confidence score
    return Math.random();
  };

  useEffect(() => {
    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
        setHasPermission(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasPermission(false);
      }
    }

    startCamera();

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // beta: pitch (-180 to 180)
      // gamma: roll (-90 to 90)
      const pitch = event.beta || 0;
      const roll = event.gamma || 0;
      
      setOrientation({ pitch, roll });
      
      // Log for debug as requested
      console.log(`[Gyroscope] Pitch: ${pitch.toFixed(2)}°, Roll: ${roll.toFixed(2)}°`);
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isTorchOn }]
        } as any);
        setIsTorchOn(!isTorchOn);
      } catch (err) {
        console.error("Error toggling torch:", err);
      }
    } else {
      setIsTorchOn(!isTorchOn);
    }
  };

  const handleCapture = async () => {
    setIsScanning(true);
    setAnalysisStep('Identifying Note...');
    setDetectedNoteLabel('');

    // Simulate frame data from camera
    const isBackSide = Math.random() > 0.5;
    const isNewSeries = Math.random() > 0.5;
    
    const mockFrameData = {
      denomination: 50 as const,
      features: isBackSide 
        ? ['rolling-patch', 'serial-number'] 
        : (isNewSeries 
            ? ['top-to-bottom-window', 'portrait'] 
            : ['small-window', 'portrait'])
    };

    // Phase 1: Side Identification
    const sideResult = SideDetectionLogic.detectSide(mockFrameData);
    setDetectedSide(sideResult.side);
    
    if (sideResult.side === 'BACK') {
      setAnalysisStep('Scanning Back Features...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Trigger Flip Note instruction
      setIsFlipping(true);
      triggerHaptic('FLIP');
      setAnalysisStep('Flip Note to Front');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsFlipping(false);
      
      // Update mock data to front side after flip
      mockFrameData.features = isNewSeries 
        ? ['top-to-bottom-window', 'portrait', 'Rolling Colour Effect', 'Spinebill Motion']
        : ['small-window', 'portrait', 'Southern Cross Window', 'Coat of Arms Watermark'];
      setDetectedSide('FRONT');
    }

    // Phase 2: Series Detection
    setAnalysisStep('Identifying Series...');
    await new Promise(resolve => setTimeout(resolve, 800));
    const { denomination, series } = await engine.detectNoteType(mockFrameData);
    
    triggerHaptic('DOUBLE_TICK');
    setAnalysisStep(`${series} Series $${denomination} Detected`);
    setDetectedNoteLabel(`$${denomination} NOTE DETECTED · ${series.toUpperCase()} SERIES`);

    // Phase 3: Validation Routine
    const plan = engine.getVerificationPlan(denomination, series);
    
    // Initialize checklist for UI
    setCurrentChecks(plan.requiredChecks.map(label => ({ label, status: 'pending' })));
    
    await new Promise(resolve => setTimeout(resolve, 800));
    setAnalysisStep('Verifying Security Features...');
    
    // Simulate incremental verification for UI feedback
    const result = await engine.verify(mockFrameData, plan, triggerHaptic);
    
    for (let i = 0; i < plan.requiredChecks.length; i++) {
      const checkLabel = plan.requiredChecks[i];
      const passed = result.passedChecks.includes(checkLabel);
      
      await new Promise(resolve => setTimeout(resolve, 400));
      setCurrentChecks(prev => prev.map((c, idx) => 
        idx === i ? { ...c, status: passed ? 'passed' : 'failed' } : c
      ));
      
      if (passed) triggerHaptic('TICK');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate getting suburb and image
    const mockImage = `https://picsum.photos/seed/${Date.now()}/800/600`;
    const mockSuburb = "Sydney CBD, NSW";

    setTimeout(() => {
      navigate('/verdict', { 
        state: { 
          status: result.status,
          result: result,
          serialNumber: result.serialNumber,
          image: mockImage,
          suburb: mockSuburb
        } 
      });
    }, 500);
  };

  const handleMicroprintCheck = async () => {
    if (!videoRef.current || isBurstProcessing) return;
    
    setIsMicroprintActive(true);
    setMicroprintStatus('Targeting Microprint...');
    triggerHaptic('MILESTONE');

    // Set target based on a $50 note anchor (simulated)
    const anchors = MICROPRINT_ANCHORS['New-50'];
    setMicroprintTarget(anchors[0]);

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setMicroprintStatus('Capturing Burst...');
    setIsBurstProcessing(true);
    triggerHaptic('TICK');

    try {
      const frames = await captureBurst(videoRef.current);
      setMicroprintStatus('Super-Resolution...');
      const sharpImage = await applySuperResolution(frames);
      
      setMicroprintStatus('OCR Validation...');
      const ocrResult = await validateMicroprint(sharpImage);

      if (ocrResult.isValid) {
        setMicroprintStatus('Verified: AUSTRALIA');
        triggerHaptic('PASS');
      } else {
        setMicroprintStatus(`Anomaly: ${ocrResult.text}`);
        triggerHaptic('REVIEW');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error("Microprint check failed:", err);
    } finally {
      setIsBurstProcessing(false);
      setIsMicroprintActive(false);
      setMicroprintStatus('5x Digital Loupe');
    }
  };

  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-bg z-50 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 bg-red/10 rounded-full flex items-center justify-center mb-6 border border-red/20">
          <CameraOff size={40} className="text-red" />
        </div>
        <h2 className={cn("text-xl font-bold text-white mb-2", isHighContrastEnabled && "font-black text-2xl")}>Camera Access Denied</h2>
        <p className={cn("text-text-dim text-sm leading-relaxed mb-8", isHighContrastEnabled && "text-white font-bold text-base")}>
          AUDScan requires camera permissions to verify banknotes. Please enable camera access in your browser settings.
        </p>
        <button 
          onClick={() => navigate(-1)}
          className={cn(
            "px-8 py-3 bg-gold text-bg font-bold rounded-xl uppercase tracking-wider text-xs",
            isHighContrastEnabled && "bg-[#CCFF00] text-black font-black text-sm border-4 border-black"
          )}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Full-screen Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Viewfinder Overlay */}
      <CameraOverlay 
        isScanning={isScanning}
        isAngleValid={SideDetectionLogic.isAngleValid(orientation.pitch)}
        detectedSide={detectedSide}
        isFlipping={isFlipping}
        analysisStep={analysisStep}
        pitch={orientation.pitch}
      />

      {/* Checklist Progress */}
      <ChecklistProgress 
        checks={currentChecks}
        isVisible={isScanning && currentChecks.length > 0}
        noteTitle={detectedNoteLabel}
      />

      {/* Microprint Loupe */}
      <MicroLoupeOverlay 
        isActive={isMicroprintActive}
        videoRef={videoRef}
        targetPoint={microprintTarget}
        isProcessing={isBurstProcessing}
        statusText={microprintStatus}
      />

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => navigate(-1)}
          className={cn(
            "p-3 bg-white/10 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform",
            isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
          )}
        >
          <X size={24} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className={cn("text-white text-[10px] font-black uppercase tracking-[0.2em] mb-1", isHighContrastEnabled && "text-sm")}>AUDScan Live</span>
          <div className="flex gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", Math.abs(orientation.roll) < 5 ? (isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-green") : "bg-white/20")} />
            <div className={cn("w-1.5 h-1.5 rounded-full", Math.abs(orientation.pitch - 45) < 10 ? (isHighContrastEnabled ? "bg-[#CCFF00]" : "bg-green") : "bg-white/20")} />
          </div>
        </div>

        <button 
          onClick={toggleTorch}
          className={cn(
            "p-3 backdrop-blur-md rounded-full transition-all active:scale-90",
            isTorchOn ? (isHighContrastEnabled ? "bg-[#CCFF00] text-black" : "bg-gold text-bg") : "bg-white/10 text-white",
            isHighContrastEnabled && !isTorchOn && "bg-black border-2 border-[#CCFF00]"
          )}
        >
          {isTorchOn ? <Zap size={24} /> : <ZapOff size={24} />}
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center bg-gradient-to-t from-black/80 to-transparent">
        <motion.p 
          animate={isHighContrastEnabled ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
          aria-label="Alignment Instruction"
          aria-description="Align note front side first"
          className={cn(
            "text-white/60 text-[10px] font-mono uppercase tracking-[0.3em] mb-8",
            isHighContrastEnabled && "text-white text-xs font-black tracking-[0.4em]"
          )}
        >
          {detectedSide === 'BACK' ? 'Back Side Detected' : 'Align Note · Front Side'}
        </motion.p>
        
        <div className="flex items-center gap-12">
          <button 
            onClick={handleMicroprintCheck}
            disabled={isScanning || isMicroprintActive}
            className={cn(
              "p-3 bg-white/5 backdrop-blur-md rounded-full text-white/40 hover:text-white transition-colors border border-white/10 flex flex-col items-center gap-1",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00] text-white opacity-100",
              isMicroprintActive && "text-gold border-gold/50"
            )}
          >
            <Search size={20} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Microprint</span>
          </button>
          
          <button 
            onClick={handleCapture}
            disabled={isScanning || isMicroprintActive}
            aria-label="Scan Banknote"
            aria-description="Triggers the verification process"
            className={cn(
              "w-20 h-20 rounded-full border-4 border-gold p-1.5 active:scale-95 transition-transform group disabled:opacity-50",
              isHighContrastEnabled && "border-[#CCFF00] border-8"
            )}
          >
            <div className={cn(
              "w-full h-full bg-gold rounded-full shadow-[0_0_30px_rgba(212,168,67,0.6)] group-hover:scale-95 transition-transform",
              isHighContrastEnabled && "bg-[#CCFF00] shadow-[#CCFF00]/50"
            )} />
          </button>

          <button 
            onClick={() => setIsLensUnclear(!isLensUnclear)}
            className={cn(
              "p-3 bg-white/5 backdrop-blur-md rounded-full text-white/40 hover:text-white transition-colors border border-white/10",
              isHighContrastEnabled && "bg-black border-2 border-[#CCFF00] text-white opacity-100"
            )}
          >
            <RefreshCcw size={20} />
          </button>
        </div>
        <GlobalFooter className="py-2 opacity-70" />
      </div>

      {/* Floating Ambient Lighting Guidance Prompt */}
      <AnimatePresence>
        {isLowLightDetected && !isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6 pointer-events-none"
            role="alert"
            aria-live="polite"
          >
            <div 
              className={cn(
                "py-3 px-4 rounded-xl flex items-center justify-center text-center shadow-lg backdrop-blur-md border",
                isHighContrastEnabled ? "bg-black border-2 border-[#CCFF00]" : ""
              )}
              style={isHighContrastEnabled ? {} : {
                backgroundColor: 'rgba(240,160,48,0.15)',
                borderColor: '#F0A030',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <span 
                className={cn(
                  "text-[11px] font-medium tracking-wide antialiased select-none",
                  isHighContrastEnabled ? "text-[#CCFF00] font-black" : "text-[#F0A030]"
                )}
              >
                💡 For best results, ensure the note is well lit
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lens Diagnostic Overlay */}
      <AnimatePresence>
        {isLensUnclear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] backdrop-blur-2xl bg-bg/60 flex flex-col items-center justify-center p-12 text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "w-24 h-24 bg-red/20 rounded-[32px] flex items-center justify-center mb-8 border border-red/30 shadow-2xl shadow-red/20",
                isHighContrastEnabled && "bg-black border-4 border-[#CCFF00]"
              )}
            >
              <AlertTriangle size={48} className={cn("text-red", isHighContrastEnabled && "text-[#CCFF00]")} />
            </motion.div>
            <h2 className={cn("text-2xl font-bold text-white mb-4 tracking-tight", isHighContrastEnabled && "text-3xl font-black")}>Lens Diagnostic</h2>
            <motion.p 
              animate={isHighContrastEnabled ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              aria-live="assertive"
              className={cn("text-text-mid text-base leading-relaxed mb-10 px-4", isHighContrastEnabled && "text-white font-black text-xl")}
            >
              ⚠️ Image Unclear: Please clean your camera lens to proceed
            </motion.p>
            <button 
              onClick={() => setIsLensUnclear(false)}
              className={cn(
                "w-full max-w-xs py-4 bg-white text-bg font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform",
                isHighContrastEnabled && "bg-[#CCFF00] text-black text-base border-4 border-black"
              )}
            >
              I've cleaned it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* One-Time On-Device Privacy Compliance Overlay */}
      <AnimatePresence>
        {!hasSeenCameraPrivacyDisclaimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-[#080B0F]/95 backdrop-blur-md flex flex-col items-center justify-between p-12 text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-heading"
            aria-describedby="privacy-desc"
          >
            {/* Top spacing */}
            <div className="flex-1" />

            {/* Privacy message branding core */}
            <div className="w-full max-w-sm flex flex-col items-center select-none">
              <div 
                className={cn(
                  "w-20 h-20 bg-gold/10 rounded-[28px] border border-gold/25 flex items-center justify-center mb-6 text-2xl shadow-xl shadow-gold/5",
                  isHighContrastEnabled && "bg-black border-2 border-[#CCFF00]"
                )}
              >
                🔒
              </div>
              
              <h2 
                id="privacy-heading"
                className={cn(
                  "text-2xl font-bold tracking-tight mb-4",
                  isHighContrastEnabled ? "text-[#CCFF00]" : "text-white"
                )}
              >
                Privacy Secured Locally
              </h2>

              <p 
                id="privacy-desc"
                className={cn(
                  "text-sm leading-relaxed max-w-xs px-2",
                  isHighContrastEnabled ? "text-white font-black" : "text-[#E8EDF2]"
                )}
                style={{ fontSize: '14px', fontWeight: 500 }}
              >
                Images are processed on your device only and are never uploaded or stored.
              </p>
            </div>

            {/* Bottom spacing */}
            <div className="flex-1" />

            {/* Full size got it CTA */}
            <div className="w-full max-w-sm">
              <button
                ref={privacyBtnRef}
                onClick={dismissPrivacy}
                aria-label="Got it, accept camera privacy disclaimer and start scanning"
                className={cn(
                  "w-full py-4 text-bg font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform",
                  isHighContrastEnabled ? "bg-[#CCFF00] text-black border-4 border-black" : "bg-gold"
                )}
                style={isHighContrastEnabled ? {} : {
                  backgroundColor: '#D4A843'
                }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
