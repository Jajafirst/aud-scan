export type Series = 'New' | 'First';
export type Denomination = 5 | 10 | 20 | 50 | 100;

export interface SecurityFeature {
  id: string;
  label: string;
  description: string;
  category: 'VISUAL' | 'TACTILE' | 'TILT';
}

export const GLOBAL_FEATURES: SecurityFeature[] = [
  { 
    id: 'polymer-substrate', 
    label: 'Polymer Substrate', 
    description: 'Returns to shape when scrunched', 
    category: 'TACTILE' 
  },
  { 
    id: 'intaglio-print', 
    label: 'Intaglio Print', 
    description: 'Raised print on portraits and numerals', 
    category: 'TACTILE' 
  },
  { 
    id: 'microprint', 
    label: 'Microprint Sharpness', 
    description: 'Tiny, sharp text visible under magnification', 
    category: 'VISUAL' 
  },
];

export const SERIES_FEATURES: Record<Series, SecurityFeature[]> = {
  'New': [
    { id: 'top-to-bottom-window', label: 'Top-to-bottom Window', description: 'Multiple security features in a clear vertical panel', category: 'VISUAL' },
    { id: 'flying-bird', label: 'Flying Bird', description: 'Bird wings move as the note is tilted', category: 'TILT' },
    { id: 'reversing-number', label: 'Reversing Number', description: 'Number in the building reverses direction on tilt', category: 'TILT' },
    { id: 'rolling-color-patch', label: 'Rolling Color Effect', description: 'A patch that shows a rolling color effect when tilted', category: 'TILT' },
  ],
  'First': [
    { id: 'small-clear-window', label: 'Small Clear Window', description: 'A small clear window with an embossed image', category: 'VISUAL' },
    { id: 'seven-pointed-star', label: 'Seven-pointed Star', description: 'Star pieces on both sides align perfectly when held to light', category: 'VISUAL' },
    { id: 'shadow-image', label: 'Shadow Image', description: 'Shadow image of the Coat of Arms visible when held to light', category: 'VISUAL' },
  ]
};

export const DENOMINATION_SPECIFIC: Record<Denomination, Record<Series, SecurityFeature[]>> = {
  5: {
    'New': [{ id: '3d-star', label: '3D Star', description: 'A 3D star image that appears to move', category: 'TILT' }],
    'First': []
  },
  10: {
    'New': [{ id: '3d-pen', label: '3D Pen', description: 'A 3D pen nib image that appears to move', category: 'TILT' }],
    'First': []
  },
  20: {
    'New': [{ id: '3d-compass', label: '3D Compass', description: 'A 3D compass image that appears to move', category: 'TILT' }],
    'First': []
  },
  50: {
    'New': [{ id: '3d-book', label: '3D Book', description: 'A 3D book image that appears to move', category: 'TILT' }],
    'First': [{ id: 'southern-cross', label: 'Southern Cross', description: 'Southern Cross constellation in the clear window', category: 'VISUAL' }]
  },
  100: {
    'New': [{ id: '3d-fan', label: '3D Fan', description: 'A 3D fan image that appears to move', category: 'TILT' }],
    'First': [{ id: 'lyrebird', label: 'Lyrebird', description: 'Lyrebird image in the clear window', category: 'VISUAL' }]
  }
};

/**
 * Generates the full checklist for a specific note
 */
export function getChecklistForNote(denomination: Denomination, series: Series): SecurityFeature[] {
  const seriesBase = SERIES_FEATURES[series];
  const denomSpecific = DENOMINATION_SPECIFIC[denomination][series];
  
  return [
    ...GLOBAL_FEATURES,
    ...seriesBase,
    ...denomSpecific
  ];
}
