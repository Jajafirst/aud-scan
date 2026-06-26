export type NoteSide = 'FRONT' | 'BACK';

export interface SideDetectionResult {
  side: NoteSide;
  confidence: number;
  featuresDetected: string[];
}

export class SideDetectionLogic {
  /**
   * Identifies which side of the banknote is currently visible.
   * FRONT: Window + Portrait
   * BACK: Rolling Patch + Serial Numbers
   */
  public static detectSide(frameData: any): SideDetectionResult {
    const features = frameData.features || [];
    
    const frontFeatures = ['top-to-bottom-window', 'portrait', 'small-window'];
    const backFeatures = ['rolling-patch', 'serial-number', 'back-portrait'];

    const frontScore = features.filter((f: string) => frontFeatures.includes(f)).length;
    const backScore = features.filter((f: string) => backFeatures.includes(f)).length;

    if (frontScore >= backScore && frontScore > 0) {
      return {
        side: 'FRONT',
        confidence: frontScore / frontFeatures.length,
        featuresDetected: features.filter((f: string) => frontFeatures.includes(f))
      };
    } else if (backScore > frontScore) {
      return {
        side: 'BACK',
        confidence: backScore / backFeatures.length,
        featuresDetected: features.filter((f: string) => backFeatures.includes(f))
      };
    }

    // Default to front if ambiguous but features exist, or return unknown-like state
    return {
      side: 'FRONT',
      confidence: 0,
      featuresDetected: []
    };
  }

  /**
   * Checks if the note is at a valid angle for scanning.
   * Steep angles (> 60 degrees) make window features hard to see.
   */
  public static isAngleValid(pitch: number): boolean {
    return Math.abs(pitch) < 60;
  }
}
