export interface SecurityFeature {
  id: string;
  title: string;
  description: string;
  howToVerify: string;
}

export interface BanknoteData {
  denomination: string;
  value: number;
  series: 'New' | 'Old';
  color: string;
  features: SecurityFeature[];
}

export const CURRENCY_DATA: BanknoteData[] = [
  // NEW SERIES (2016-2020)
  {
    denomination: '$5',
    value: 5,
    series: 'New',
    color: '#FFB3BA',
    features: [
      {
        id: 'n5-1',
        title: 'Top-to-bottom window',
        description: 'A clear window runs from the top to the bottom of the banknote.',
        howToVerify: 'Look for the window to be integrated into the note, not added on.'
      },
      {
        id: 'n5-2',
        title: 'Eastern Spinebill',
        description: 'A small bird that moves its wings and changes color.',
        howToVerify: 'Tilt the note to see the bird move its wings and change color.'
      },
      {
        id: 'n5-3',
        title: 'Rolling color effect',
        description: 'A patch on the bird changes color when the note is tilted.',
        howToVerify: 'Tilt the note to see a rolling color effect.'
      },
      {
        id: 'n5-4',
        title: 'Tactile feature',
        description: 'Raised bumps to help the vision-impaired.',
        howToVerify: 'Feel for one raised bump on each of the long edges.'
      }
    ]
  },
  {
    denomination: '$10',
    value: 10,
    series: 'New',
    color: '#BAE1FF',
    features: [
      {
        id: 'n10-1',
        title: 'Top-to-bottom window',
        description: 'A clear window runs from the top to the bottom of the banknote.',
        howToVerify: 'Check the window for multiple security features.'
      },
      {
        id: 'n10-2',
        title: 'Bramble Finch',
        description: 'A bird that moves its wings and changes color.',
        howToVerify: 'Tilt the note to see the bird move its wings.'
      },
      {
        id: 'n10-3',
        title: 'Tactile feature',
        description: 'Raised bumps on the long edges.',
        howToVerify: 'Feel for two raised bumps on each of the long edges.'
      }
    ]
  },
  {
    denomination: '$20',
    value: 20,
    series: 'New',
    color: '#FFDFBA',
    features: [
      {
        id: 'n20-1',
        title: 'Top-to-bottom window',
        description: 'A clear window runs from the top to the bottom of the banknote.',
        howToVerify: 'Look for the Laughing Kookaburra in the window.'
      },
      {
        id: 'n20-2',
        title: 'Laughing Kookaburra',
        description: 'A bird that moves its wings and changes color.',
        howToVerify: 'Tilt the note to see the bird move its wings.'
      },
      {
        id: 'n20-3',
        title: 'Tactile feature',
        description: 'Raised bumps on the long edges.',
        howToVerify: 'Feel for three raised bumps on each of the long edges.'
      }
    ]
  },
  {
    denomination: '$50',
    value: 50,
    series: 'New',
    color: '#FFFFBA',
    features: [
      {
        id: 'n50-1',
        title: 'Top-to-bottom window',
        description: 'A clear window runs from the top to the bottom of the banknote.',
        howToVerify: 'Look for the Black Swan in the window.'
      },
      {
        id: 'n50-2',
        title: 'Black Swan',
        description: 'A bird that moves its wings and changes color.',
        howToVerify: 'Tilt the note to see the bird move its wings.'
      },
      {
        id: 'n50-3',
        title: 'Tactile feature',
        description: 'Raised bumps on the long edges.',
        howToVerify: 'Feel for four raised bumps on each of the long edges.'
      }
    ]
  },
  {
    denomination: '$100',
    value: 100,
    series: 'New',
    color: '#BFFCC6',
    features: [
      {
        id: 'n100-1',
        title: 'Top-to-bottom window',
        description: 'A clear window runs from the top to the bottom of the banknote.',
        howToVerify: 'Look for the Australian Masked Owl in the window.'
      },
      {
        id: 'n100-2',
        title: 'Australian Masked Owl',
        description: 'A bird that moves its wings and changes color.',
        howToVerify: 'Tilt the note to see the bird move its wings.'
      },
      {
        id: 'n100-3',
        title: 'Tactile feature',
        description: 'Raised bumps on the long edges.',
        howToVerify: 'Feel for five raised bumps on each of the long edges.'
      }
    ]
  },
  // OLD SERIES
  {
    denomination: '$5',
    value: 5,
    series: 'Old',
    color: '#FFB3BA',
    features: [
      {
        id: 'o5-1',
        title: 'Polymer substrate',
        description: 'Australian banknotes are printed on polymer (plastic).',
        howToVerify: 'Feel the note; it should have a distinct plastic feel and be difficult to tear.'
      },
      {
        id: 'o5-2',
        title: 'Clear window',
        description: 'A small clear window with a stylized gum flower.',
        howToVerify: 'Check that the window is part of the note and not an addition.'
      },
      {
        id: 'o5-3',
        title: 'Seven-pointed star',
        description: 'A star is printed on both sides of the note.',
        howToVerify: 'Hold the note up to the light to see the star pieces align perfectly.'
      }
    ]
  },
  {
    denomination: '$10',
    value: 10,
    series: 'Old',
    color: '#BAE1FF',
    features: [
      {
        id: 'o10-1',
        title: 'Polymer substrate',
        description: 'Printed on polymer plastic.',
        howToVerify: 'Feel for the plastic texture.'
      },
      {
        id: 'o10-2',
        title: 'Clear window',
        description: 'A small clear window with a windmill pattern.',
        howToVerify: 'Verify the window is integrated into the note.'
      }
    ]
  },
  {
    denomination: '$20',
    value: 20,
    series: 'Old',
    color: '#FFDFBA',
    features: [
      {
        id: 'o20-1',
        title: 'Polymer substrate',
        description: 'Printed on polymer plastic.',
        howToVerify: 'Feel for the plastic texture.'
      },
      {
        id: 'o20-2',
        title: 'Clear window',
        description: 'A small clear window with a compass pattern.',
        howToVerify: 'Verify the window is integrated into the note.'
      }
    ]
  },
  {
    denomination: '$50',
    value: 50,
    series: 'Old',
    color: '#FFFFBA',
    features: [
      {
        id: 'o50-1',
        title: 'Polymer substrate',
        description: 'Printed on polymer plastic.',
        howToVerify: 'Feel for the plastic texture.'
      },
      {
        id: 'o50-2',
        title: 'Clear window',
        description: 'A small clear window with a Southern Cross pattern.',
        howToVerify: 'Verify the window is integrated into the note.'
      }
    ]
  },
  {
    denomination: '$100',
    value: 100,
    series: 'Old',
    color: '#BFFCC6',
    features: [
      {
        id: 'o100-1',
        title: 'Polymer substrate',
        description: 'Printed on polymer plastic.',
        howToVerify: 'Feel for the plastic texture.'
      },
      {
        id: 'o100-2',
        title: 'Clear window',
        description: 'A small clear window with a Lyrebird pattern.',
        howToVerify: 'Verify the window is integrated into the note.'
      }
    ]
  }
];
