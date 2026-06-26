import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { Series, Denomination, getChecklistForNote } from './ChecklistMatrix';

export interface VerificationPlan {
  denomination: Denomination;
  series: Series;
  requiredChecks: string[];
}

export interface VerificationResult {
  status: 'PASS' | 'REVIEW';
  detectedDenomination?: Denomination;
  detectedSeries?: Series;
  failedChecks: string[];
  passedChecks: string[];
  serialNumber: string;
}

export class VerificationEngine {
  private static instance: VerificationEngine;
  
  private constructor() {}

  public static getInstance(): VerificationEngine {
    if (!VerificationEngine.instance) {
      VerificationEngine.instance = new VerificationEngine();
    }
    return VerificationEngine.instance;
  }

  /**
   * Generates a realistic AUD serial number
   * Format: [2 letters] [2 digits] [3 digits] [3 digits]
   * Example: AA 12 345 678
   */
  public generateSerialNumber(): string {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    
    const d1 = Math.floor(Math.random() * 90 + 10); // 10-99
    const d2 = Math.floor(Math.random() * 900 + 100); // 100-999
    const d3 = Math.floor(Math.random() * 900 + 100); // 100-999
    
    return `${l1}${l2} ${d1} ${d2} ${d3}`;
  }

  /**
   * Phase 1: Detection
   * Simulates on-device model identification
   */
  public async detectNoteType(frameData: any): Promise<{ denomination: Denomination; series: Series }> {
    // Logic: 'New' if top-to-bottom window detected
    const hasTopToBottomWindow = frameData.features?.includes('top-to-bottom-window');
    const series: Series = hasTopToBottomWindow ? 'New' : 'First';
    
    const denomination: Denomination = frameData.denomination || 50;

    return { denomination, series };
  }

  /**
   * Phase 2: Logic Mapping
   */
  public getVerificationPlan(denomination: Denomination, series: Series): VerificationPlan {
    const checklist = getChecklistForNote(denomination, series);
    
    return {
      denomination,
      series,
      requiredChecks: checklist.map(f => f.label)
    };
  }

  /**
   * Phase 3: Validation Routine
   */
  public async verify(
    frameData: any, 
    plan: VerificationPlan, 
    triggerHaptic: (type: any) => void
  ): Promise<VerificationResult> {
    const passedChecks: string[] = [];
    const failedChecks: string[] = [];

    // Validation Routine: If a 'New' feature is found on a 'First' note layout, trigger immediate REVIEW
    const detectedNewFeatures = frameData.features?.filter((f: string) => 
      ['Rolling Colour Effect', 'Spinebill Motion', 'top-to-bottom-window'].includes(f)
    ) || [];

    if (plan.series === 'First' && detectedNewFeatures.length > 0) {
      return {
        status: 'REVIEW',
        detectedDenomination: plan.denomination,
        detectedSeries: plan.series,
        passedChecks: [],
        failedChecks: ['Cross-Series Anomaly Detected'],
        serialNumber: this.generateSerialNumber()
      };
    }

    // Perform specific checks based on plan
    for (const check of plan.requiredChecks) {
      // In a real app, the AI would look for these specific labels in its detection stream
      const isFeaturePresent = frameData.features?.includes(check);
      if (isFeaturePresent) {
        passedChecks.push(check);
      } else {
        failedChecks.push(check);
      }
    }

    const status = failedChecks.length === 0 ? 'PASS' : 'REVIEW';

    return {
      status,
      detectedDenomination: plan.denomination,
      detectedSeries: plan.series,
      passedChecks,
      failedChecks,
      serialNumber: this.generateSerialNumber()
    };
  }
}
