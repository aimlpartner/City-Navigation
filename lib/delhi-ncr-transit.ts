export interface MetroStation {
  id: string;
  name: string;
  line: 'Yellow' | 'Rapid Metro' | 'Blue' | 'Magenta' | 'Violet' | 'Airport Express' | 'Pink';
  lineColor: string;
  lat: number;
  lng: number;
  interchangeWith?: ('Yellow' | 'Rapid Metro' | 'Blue' | 'Magenta' | 'Violet' | 'Airport Express' | 'Pink')[];
  exitGates: { gateNumber: number; leadsTo: string; tip?: string }[];
}

export interface FamousDestination {
  id: string;
  name: string;
  city: 'Gurgaon' | 'Delhi' | 'Noida';
  category: 'Mall' | 'Tech Park / Hub' | 'Dining / Nightlife' | 'Attraction / Market';
  lat: number;
  lng: number;
  nearestStationId: string;
  distanceFromStationKm: number;
  bestExitGate: number;
  lastMileOptions: {
    mode: 'walk' | 'auto' | 'cab' | 'e-rickshaw';
    durationMin: number;
    estimatedCostInr: number;
    description: string;
  }[];
  introvertTips: string[];
}

// Key stations focusing heavily on Gurgaon (Cyber City, Rapid Metro, Yellow Line) and Delhi connection
export const METRO_STATIONS: Record<string, MetroStation> = {
  // Rapid Metro Gurgaon Stations
  'moulsari-avenue': {
    id: 'moulsari-avenue',
    name: 'Moulsari Avenue',
    line: 'Rapid Metro',
    lineColor: '#0284c7', // Sky Blue / Cyan
    lat: 28.5029,
    lng: 77.0984,
    exitGates: [
      { gateNumber: 1, leadsTo: 'DLF Phase 3 / Moulsari Arcade', tip: 'Best for local cabs and autos' },
      { gateNumber: 2, leadsTo: 'Ambience Mall Side / NH-48 Service Rd', tip: 'Closest exit for Ambience Mall (5-7 min walk or 2 min e-rickshaw)' },
    ]
  },
  'cyber-city': {
    id: 'cyber-city',
    name: 'Cyber City',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4947,
    lng: 77.0886,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Cyber Hub Building 10 / Gateway Tower', tip: 'Direct covered walkway straight into DLF Cyber Hub without crossing traffic' },
      { gateNumber: 2, leadsTo: 'Building 8 / Standard Chartered', tip: 'Cab pickup zone under the bridge' },
    ]
  },
  'phase-3': {
    id: 'phase-3',
    name: 'Phase 3 (Gurgaon)',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4912,
    lng: 77.0967,
    exitGates: [
      { gateNumber: 1, leadsTo: 'DLF Phase 3 U-Block / V-Block' },
      { gateNumber: 2, leadsTo: 'RBS / Tech Parks' }
    ]
  },
  'phase-2': {
    id: 'phase-2',
    name: 'Phase 2 (Gurgaon)',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4905,
    lng: 77.0815,
    exitGates: [
      { gateNumber: 1, leadsTo: 'NH-48 Service Road' },
      { gateNumber: 2, leadsTo: 'DLF Phase 2 Residential' }
    ]
  },
  'sikanderpur-rapid': {
    id: 'sikanderpur-rapid',
    name: 'Sikanderpur (Rapid Metro)',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4816,
    lng: 77.0931,
    interchangeWith: ['Yellow'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'Direct Elevated Interchange Walkway to Yellow Line', tip: 'Follow green/yellow overhead footbridge; no need to exit fare gates or buy new token!' },
      { gateNumber: 2, leadsTo: 'MG Road / Bristol Hotel' }
    ]
  },
  'sector-54-chowk': {
    id: 'sector-54-chowk',
    name: 'Sector 54 Chowk',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4417,
    lng: 77.1065,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Golf Course Road' },
      { gateNumber: 2, leadsTo: 'Suncity / Sector 54' }
    ]
  },
  'sector-42-43': {
    id: 'sector-42-43',
    name: 'Sector 42-43 (Golf Course Road)',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4610,
    lng: 77.0988,
    exitGates: [
      { gateNumber: 1, leadsTo: 'One & Two Horizon Center / DLF Phase 5', tip: 'Horizon Center plaza is a 200m walk via direct pedestrian sidewalk' },
      { gateNumber: 2, leadsTo: 'Global Foyer / Golf Course Road West' }
    ]
  },
  'sector-53-54': {
    id: 'sector-53-54',
    name: 'Sector 53-54',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4504,
    lng: 77.1030,
    exitGates: [
      { gateNumber: 1, leadsTo: 'South Point Mall / Parsvnath Exotica', tip: 'South Point Mall is directly across the road (2 min walk)' },
      { gateNumber: 2, leadsTo: 'Suncity Business Tower / Golf Course Road' }
    ]
  },
  'sector-55-56': {
    id: 'sector-55-56',
    name: 'Sector 55-56 (Terminal)',
    line: 'Rapid Metro',
    lineColor: '#0284c7',
    lat: 28.4287,
    lng: 77.1105,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Hong Kong Bazaar / Sector 56' },
      { gateNumber: 2, leadsTo: 'Golf Course Extension Road' }
    ]
  },

  // Delhi Metro Yellow Line (South Delhi -> Gurgaon)
  'millennium-city-centre': {
    id: 'millennium-city-centre',
    name: 'Millennium City Centre Gurugram (HUDA City Centre)',
    line: 'Yellow',
    lineColor: '#eab308', // Yellow
    lat: 28.4593,
    lng: 77.0726,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Fortis Hospital / Sector 29 Food & Pub Hub', tip: 'Walk 500m to Sector 29 market' },
      { gateNumber: 2, leadsTo: 'Appu Ghar / Oysters Water Park' },
      { gateNumber: 3, leadsTo: 'Max Hospital / Galleria Market Cab Bay' }
    ]
  },
  'iffco-chowk': {
    id: 'iffco-chowk',
    name: 'IFFCO Chowk',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.4720,
    lng: 77.0725,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Sector 29 / Leisure Valley' },
      { gateNumber: 2, leadsTo: 'MG Road / NH-48 flyover' }
    ]
  },
  'mg-road': {
    id: 'mg-road',
    name: 'MG Road (Gurgaon)',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.4797,
    lng: 77.0801,
    exitGates: [
      { gateNumber: 1, leadsTo: 'MGF Metropolitan Mall', tip: 'Direct exit steps from mall entrance' },
      { gateNumber: 2, leadsTo: 'DT City Centre Mall & Main MG Road' }
    ]
  },
  'sikanderpur-yellow': {
    id: 'sikanderpur-yellow',
    name: 'Sikanderpur (Yellow Line)',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.4816,
    lng: 77.0931,
    interchangeWith: ['Rapid Metro'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'Rapid Metro Dedicated Transfer Walkway', tip: 'Elevated skywalk connects directly to Rapid Metro platform. Keep your card/token ready.' },
      { gateNumber: 2, leadsTo: 'MG Road / Sikanderpur Market Autos' }
    ]
  },
  'guru-dronacharya': {
    id: 'guru-dronacharya',
    name: 'Guru Dronacharya',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.4899,
    lng: 77.1025,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Global Foyer / Golf Course Road start' },
      { gateNumber: 2, leadsTo: 'Garden Estate / NH-48 link' }
    ]
  },
  'chhatarpur': {
    id: 'chhatarpur',
    name: 'Chhatarpur',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5065,
    lng: 77.1747,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Chhatarpur Mandir Complex' },
      { gateNumber: 2, leadsTo: 'Vasant Kunj Malls (Promenade, Emporio, Ambience VK)', tip: 'Take ₹40-50 auto or e-rickshaw straight down Nelson Mandela Marg to the malls' }
    ]
  },
  'qutab-minar': {
    id: 'qutab-minar',
    name: 'Qutab Minar',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5134,
    lng: 77.1859,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Qutab Minar Monument (1.2 km - take ₹20 e-rickshaw)' },
      { gateNumber: 2, leadsTo: 'Mehrauli Bus Terminal' }
    ]
  },
  'saket': {
    id: 'saket',
    name: 'Saket',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5204,
    lng: 77.2014,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Saidulajab / Champa Gali', tip: 'Walk 400m into Saidulajab lane for Champa Gali cafes' },
      { gateNumber: 2, leadsTo: 'Select CITYWALK / DLF Avenue Auto Stand', tip: 'Fixed auto stand right outside Gate 2, ~₹40-50 to the malls' }
    ]
  },
  'hauz-khas': {
    id: 'hauz-khas',
    name: 'Hauz Khas',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5433,
    lng: 77.2064,
    interchangeWith: ['Magenta'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'Aurobindo Marg / IIT Flyover' },
      { gateNumber: 2, leadsTo: 'Hauz Khas Village Auto Stand', tip: 'Take auto to HKV (~₹50-60, 1.8km)' },
      { gateNumber: 3, leadsTo: 'Magenta Line Underground Interchange' }
    ]
  },
  'aiims': {
    id: 'aiims',
    name: 'AIIMS',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5684,
    lng: 77.2078,
    exitGates: [
      { gateNumber: 1, leadsTo: 'AIIMS Main Hospital' },
      { gateNumber: 2, leadsTo: 'Safdarjung Hospital' }
    ]
  },
  'dilli-haat-ina': {
    id: 'dilli-haat-ina',
    name: 'Dilli Haat - INA',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5744,
    lng: 77.2096,
    interchangeWith: ['Pink'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'Dilli Haat Crafts & Food Bazaar', tip: 'Gate 1 exits directly at the entrance gate of Dilli Haat!' },
      { gateNumber: 2, leadsTo: 'INA Fresh Food & Spice Market' },
      { gateNumber: 5, leadsTo: 'Sarojini Nagar Market auto/feeder stand' }
    ]
  },
  'jor-bagh': {
    id: 'jor-bagh',
    name: 'Jor Bagh',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5866,
    lng: 77.2120,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Jor Bagh Colony & Karbala' },
      { gateNumber: 2, leadsTo: 'Lodhi Garden & Lodhi Art District', tip: 'Lodhi Garden Gate 1 is a peaceful 400m walk along shaded Lodhi Road' }
    ]
  },
  'lok-kalyan-marg': {
    id: 'lok-kalyan-marg',
    name: 'Lok Kalyan Marg',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.5997,
    lng: 77.2144,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Race Course & Gymkhana Club' },
      { gateNumber: 2, leadsTo: 'Khan Market & Claridges Hotel', tip: 'Take a 3-min auto or 900m walk to Khan Market Middle Lane' }
    ]
  },
  'central-secretariat': {
    id: 'central-secretariat',
    name: 'Central Secretariat',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.6146,
    lng: 77.2119,
    interchangeWith: ['Violet'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'Krishi Bhawan / Kartavya Path' },
      { gateNumber: 3, leadsTo: 'India Gate / National Museum', tip: 'Kartavya Path walkway is 1 km walk or quick battery rickshaw' }
    ]
  },
  'rajiv-chowk': {
    id: 'rajiv-chowk',
    name: 'Rajiv Chowk (Connaught Place)',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.6328,
    lng: 77.2195,
    interchangeWith: ['Blue'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'CP Radial Road 1 / Block B & C' },
      { gateNumber: 2, leadsTo: 'CP Central Park / Palika Bazaar' },
      { gateNumber: 5, leadsTo: 'Janpath Market & Tibetan Market link' },
      { gateNumber: 6, leadsTo: 'Block D, E, F / Janpath Market link' },
      { gateNumber: 8, leadsTo: 'Radial Road 7 / Regal Cinema' }
    ]
  },
  'new-delhi': {
    id: 'new-delhi',
    name: 'New Delhi Railway Station / Airport Express',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.6431,
    lng: 77.2223,
    interchangeWith: ['Airport Express'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'New Delhi Railway Station Ajmeri Gate Side' },
      { gateNumber: 2, leadsTo: 'Airport Express Metro Terminal (Underground Walkway)' }
    ]
  },
  'chawri-bazar': {
    id: 'chawri-bazar',
    name: 'Chawri Bazar (Old Delhi)',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.6496,
    lng: 77.2263,
    exitGates: [
      { gateNumber: 3, leadsTo: 'Jama Masjid & Matia Mahal Food Lane', tip: 'Take Gate 3 and walk 400m along street straight to Jama Masjid & Karim\'s / Aslam Chicken' }
    ]
  },
  'chandni-chowk': {
    id: 'chandni-chowk',
    name: 'Chandni Chowk (Old Delhi)',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.6578,
    lng: 77.2301,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Chandni Chowk Heritage Promenade & Red Fort', tip: 'Pedestrianized promenade leads right to Red Fort (10 min walk)' },
      { gateNumber: 3, leadsTo: 'Old Delhi Railway Station (DLI)' },
      { gateNumber: 5, leadsTo: 'Paranthe Wali Gali & Dariba Kalan Jewellery Market' }
    ]
  },
  'vidhan-sabha': {
    id: 'vidhan-sabha',
    name: 'Vidhan Sabha (Delhi University / MKT)',
    line: 'Yellow',
    lineColor: '#eab308',
    lat: 28.6879,
    lng: 77.2173,
    exitGates: [
      { gateNumber: 2, leadsTo: 'Majnu Ka Tilla (Tibetan Colony)', tip: 'E-rickshaws wait outside Gate 2. Fixed ₹20/passenger to MKT main gate.' }
    ]
  },

  // Airport Express Line (Orange)
  'igi-airport-t3': {
    id: 'igi-airport-t3',
    name: 'IGI Airport Terminal 3',
    line: 'Airport Express',
    lineColor: '#ea580c', // Orange
    lat: 28.5562,
    lng: 77.0864,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Terminal 3 International & Domestic Departures' },
      { gateNumber: 2, leadsTo: 'Terminal 2 Shuttle & Aerocity' }
    ]
  },
  'aerocity': {
    id: 'aerocity',
    name: 'Delhi Aerocity',
    line: 'Airport Express',
    lineColor: '#ea580c',
    lat: 28.5487,
    lng: 77.1206,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Worldmark 1, 2, 3 & Aerocity Hospitality District', tip: 'Direct covered walk to Worldmark restaurants and food capital' },
      { gateNumber: 2, leadsTo: 'Mahipalpur Main Road' }
    ]
  },
  'yashobhoomi-dwarka': {
    id: 'yashobhoomi-dwarka',
    name: 'Yashobhoomi Dwarka Sector 25',
    line: 'Airport Express',
    lineColor: '#ea580c',
    lat: 28.5539,
    lng: 77.0175,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Yashobhoomi Convention & Expo Centre Concourse', tip: 'Subway opens directly into convention foyers and exhibition halls' }
    ]
  },

  // Violet & Pink Line Stations
  'khan-market': {
    id: 'khan-market',
    name: 'Khan Market',
    line: 'Violet',
    lineColor: '#7c3aed',
    lat: 28.6004,
    lng: 77.2272,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Khan Market Main U-Shaped Complex', tip: 'Gate 1 exits onto Humayun Road directly facing Khan Market middle lane' }
    ]
  },
  'jln-stadium': {
    id: 'jln-stadium',
    name: 'JLN Stadium',
    line: 'Violet',
    lineColor: '#7c3aed',
    lat: 28.5898,
    lng: 77.2346,
    exitGates: [
      { gateNumber: 2, leadsTo: 'Sundar Nursery & Humayun\'s Tomb', tip: 'Take a 3-min ₹30 auto from Gate 2 to Sundar Nursery main heritage gate' }
    ]
  },
  'sarojini-nagar': {
    id: 'sarojini-nagar',
    name: 'Sarojini Nagar',
    line: 'Pink',
    lineColor: '#db2777',
    lat: 28.5772,
    lng: 77.1982,
    exitGates: [
      { gateNumber: 1, leadsTo: 'Sarojini Nagar Export Market', tip: 'Follow Gate 1 steps directly into the main garment bazaar' }
    ]
  },

  // Magenta Line Key Stations
  'terminal-1-igi': {
    id: 'terminal-1-igi',
    name: 'Terminal 1-IGI Airport',
    line: 'Magenta',
    lineColor: '#be185d', // Magenta / Pink-red
    lat: 28.5672,
    lng: 77.1128,
    exitGates: [
      { gateNumber: 1, leadsTo: 'T1 Departures & Arrivals (direct lift access)' }
    ]
  },
  'kalkaji-mandir': {
    id: 'kalkaji-mandir',
    name: 'Kalkaji Mandir',
    line: 'Magenta',
    lineColor: '#be185d',
    lat: 28.5492,
    lng: 77.2577,
    interchangeWith: ['Violet'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'Lotus Temple & Kalkaji Mandir', tip: 'Lotus Temple is 600m from Gate 1' }
    ]
  },
  'botanical-garden': {
    id: 'botanical-garden',
    name: 'Botanical Garden (Noida)',
    line: 'Magenta',
    lineColor: '#be185d',
    lat: 28.5642,
    lng: 77.3344,
    interchangeWith: ['Blue'],
    exitGates: [
      { gateNumber: 1, leadsTo: 'Noida Sector 37 / Bus Bay' },
      { gateNumber: 2, leadsTo: 'DLF Mall of India Shuttle / Autos' }
    ]
  }
};

// Famous destinations newcomers and locals visit in Delhi NCR & Gurgaon
export const FAMOUS_DESTINATIONS: FamousDestination[] = [
  // --- GURGAON HOTSPOTS ---
  {
    id: 'ambience-mall-gurgaon',
    name: 'Ambience Mall, Gurugram',
    city: 'Gurgaon',
    category: 'Mall',
    lat: 28.5049,
    lng: 77.0968,
    nearestStationId: 'moulsari-avenue',
    distanceFromStationKm: 0.9,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 9,
        estimatedCostInr: 0,
        description: 'Walk out of Gate 2, follow the paved service road parallel to NH-48 towards Ambience Island entry. Fully pedestrian safe.'
      },
      {
        mode: 'e-rickshaw',
        durationMin: 3,
        estimatedCostInr: 20,
        description: 'Battery E-rickshaws wait directly at Gate 2. Just say "Ambience Mall gate". Fixed standard fare is ₹20 per seat.'
      },
      {
        mode: 'auto',
        durationMin: 3,
        estimatedCostInr: 40,
        description: 'Autos queue right outside the station. Or book Uber/Rapido Auto for ₹35-45 so you don\'t have to haggle.'
      }
    ],
    introvertTips: [
      'Moulsari Avenue is the closest Rapid Metro station to Ambience Mall (NOT Sikanderpur or Cyber City).',
      'If coming from Yellow Line (Delhi/Huda City Centre), switch to Rapid Metro at Sikanderpur via the elevated footbridge.',
      'Book a Rapido or Uber Auto directly from Gate 2 so the driver already has your destination and fare fixed — zero talking needed!',
      'Mall entry is on the ground floor next to Leela Hotel driveway.'
    ]
  },
  {
    id: 'dlf-cyber-hub',
    name: 'DLF Cyber Hub, Gurugram',
    city: 'Gurgaon',
    category: 'Tech Park / Hub',
    lat: 28.4950,
    lng: 77.0890,
    nearestStationId: 'cyber-city',
    distanceFromStationKm: 0.1,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 2,
        estimatedCostInr: 0,
        description: 'Take Gate 1. It leads straight onto an air-conditioned covered elevated footbridge leading directly into the heart of Cyber Hub restaurants!'
      }
    ],
    introvertTips: [
      'Zero cabs or autos required! The Cyber City Rapid Metro station connects seamlessly into Cyber Hub.',
      'Take Gate 1 and just follow the crowd onto the skywalk.',
      'All top cafes, bars, and offices (Buildings 8, 9, 10) are directly accessible via the pedestrian walkway.'
    ]
  },
  {
    id: 'horizon-center-golf-course',
    name: 'One & Two Horizon Center, Golf Course Road',
    city: 'Gurgaon',
    category: 'Dining / Nightlife',
    lat: 28.4608,
    lng: 77.0984,
    nearestStationId: 'sector-42-43',
    distanceFromStationKm: 0.3,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 4,
        estimatedCostInr: 0,
        description: 'Step out of Gate 1, follow the pedestrian sidewalk 250m north directly onto the Horizon Center plaza.'
      }
    ],
    introvertTips: [
      'De-board at Sector 42-43 station on Rapid Metro. Do NOT get off at Sikanderpur.',
      'Horizon Center hosts Michelin-calibre dining like Comorin, Town Hall, Hahn\'s Kitchen, and Artusi.',
      'Pedestrian walkway is peaceful, clean, and completely removed from highway traffic.'
    ]
  },
  {
    id: 'thirty-two-avenue-gurgaon',
    name: '32nd Avenue (32nd Milestone), NH-48',
    city: 'Gurgaon',
    category: 'Dining / Nightlife',
    lat: 28.4616,
    lng: 77.0494,
    nearestStationId: 'iffco-chowk',
    distanceFromStationKm: 2.2,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 7,
        estimatedCostInr: 50,
        description: 'Take an auto from IFFCO Chowk Gate 2 down the NH-48 service road straight to 32nd Avenue archway.'
      },
      {
        mode: 'cab',
        durationMin: 6,
        estimatedCostInr: 75,
        description: 'Uber/Ola cab directly to 32nd Avenue drop-off bay.'
      }
    ],
    introvertTips: [
      'IFFCO Chowk (Yellow Line) is the fastest transit link to 32nd Avenue.',
      'The venue has European cobblestone pathways with iconic dining: Carnatic Cafe, The Piano Man, Paul, and CAD Tech Bar.',
      'Drop-off is right at the entry gate where valets manage traffic quietly.'
    ]
  },
  {
    id: 'galleria-market-gurgaon',
    name: 'Galleria Market, DLF Phase 4',
    city: 'Gurgaon',
    category: 'Attraction / Market',
    lat: 28.4673,
    lng: 77.0818,
    nearestStationId: 'iffco-chowk',
    distanceFromStationKm: 1.5,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 5,
        estimatedCostInr: 40,
        description: 'Auto from IFFCO Chowk or Millennium City Centre directly to Galleria Fountain Circle.'
      },
      {
        mode: 'e-rickshaw',
        durationMin: 7,
        estimatedCostInr: 20,
        description: 'Shared e-rickshaw plying towards DLF Phase 4 Galleria.'
      }
    ],
    introvertTips: [
      'Gurgaon\'s quintessential open-air neighbourhood market with cafes, bookshops, and street chaat.',
      'Exit Gate 1 at IFFCO Chowk or Gate 3 at Millennium City Centre; book an auto on Uber for a hassle-free ₹40 ride.',
      'The central open courtyard has ample benches to relax without any pressure.'
    ]
  },
  {
    id: 'sector-29-gurgaon',
    name: 'Sector 29 Food & Brewery Hub, Gurugram',
    city: 'Gurgaon',
    category: 'Dining / Nightlife',
    lat: 28.4682,
    lng: 77.0655,
    nearestStationId: 'iffco-chowk',
    distanceFromStationKm: 0.8,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 8,
        estimatedCostInr: 0,
        description: 'Walk towards Leisure Valley Park side from IFFCO Chowk Gate 1 or Millennium City Centre Gate 1.'
      },
      {
        mode: 'auto',
        durationMin: 3,
        estimatedCostInr: 40,
        description: 'Quick ₹40 auto from station exit to Sector 29 Main Market circle.'
      }
    ],
    introvertTips: [
      'You can get off at either IFFCO Chowk or Millennium City Centre (both Yellow Line).',
      'IFFCO Chowk Gate 1 is slightly quieter and less crowded during evening peak hours.',
      'Surrounded by 30+ craft microbreweries, rooftop lounges, and live music venues.'
    ]
  },
  {
    id: 'worldmark-gurgaon-sec65',
    name: 'WorldMark Gurgaon, Sector 65 (Golf Course Ext)',
    city: 'Gurgaon',
    category: 'Dining / Nightlife',
    lat: 28.4069,
    lng: 77.0694,
    nearestStationId: 'sector-55-56',
    distanceFromStationKm: 3.6,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 9,
        estimatedCostInr: 60,
        description: 'Auto down Golf Course Extension Road straight to Worldmark central lakeside drop-off.'
      },
      {
        mode: 'cab',
        durationMin: 8,
        estimatedCostInr: 90,
        description: 'Direct Uber/Ola from Rapid Metro Sector 55-56 terminal.'
      }
    ],
    introvertTips: [
      'Take Rapid Metro to the final southern stop: Sector 55-56.',
      'From Gate 2, book an auto via Rapido/Uber directly down Golf Course Extension Road.',
      'Features a stunning artificial lake promenade lined with cafes, Under The Neem, and open-air seating.'
    ]
  },
  {
    id: 'south-point-mall-gurgaon',
    name: 'South Point Mall, Golf Course Road',
    city: 'Gurgaon',
    category: 'Mall',
    lat: 28.4502,
    lng: 77.1026,
    nearestStationId: 'sector-53-54',
    distanceFromStationKm: 0.1,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 2,
        estimatedCostInr: 0,
        description: 'Step out of Gate 1, use the pedestrian zebra crossing right into South Point Mall atrium.'
      }
    ],
    introvertTips: [
      'Sector 53-54 Rapid Metro station is literally right in front of South Point Mall.',
      'Famous as NCR\'s top Japanese and Korean enclave: authentic ramen bars, Sibang Bakery, and specialized grocery stores.',
      'Very calm and uncrowded compared to massive highway malls.'
    ]
  },
  {
    id: 'mgf-metropolitan-gurgaon',
    name: 'MGF Metropolitan Mall, MG Road',
    city: 'Gurgaon',
    category: 'Mall',
    lat: 28.4802,
    lng: 77.0805,
    nearestStationId: 'mg-road',
    distanceFromStationKm: 0.05,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 1,
        estimatedCostInr: 0,
        description: 'MG Road Metro Gate 1 escalator lands directly at the MGF Metropolitan entrance steps!'
      }
    ],
    introvertTips: [
      'Zero street crossing required: MG Road station Gate 1 touches the mall entrance.',
      'Contains PVR Superplex, food court, Shoppers Stop, and bookstores.',
      'If you need DT City Centre mall across the road, use the overhead pedestrian footbridge.'
    ]
  },
  {
    id: 'good-earth-city-centre',
    name: 'Good Earth City Centre, Sector 50 (Sohna Road)',
    city: 'Gurgaon',
    category: 'Dining / Nightlife',
    lat: 28.4239,
    lng: 77.0601,
    nearestStationId: 'millennium-city-centre',
    distanceFromStationKm: 4.8,
    bestExitGate: 3,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 12,
        estimatedCostInr: 80,
        description: 'Auto via Netaji Subhash Marg & Vikas Marg straight to Good Earth entry.'
      },
      {
        mode: 'cab',
        durationMin: 11,
        estimatedCostInr: 110,
        description: 'Uber Auto or Go from Millennium City Centre Gate 3 cab bay.'
      }
    ],
    introvertTips: [
      'Millennium City Centre (Yellow Line) is the primary metro connection.',
      'Good Earth is an open-air European style promenade filled with bakeries, boutique salons, and breweries (Beer Cafe, Chaayos, Tossin Pizza).',
      'The multi-level basement parking keeps the above-ground courtyard quiet and completely car-free.'
    ]
  },
  {
    id: 'ardee-mall-gurgaon',
    name: 'Ardee Mall, Sector 52',
    city: 'Gurgaon',
    category: 'Mall',
    lat: 28.4485,
    lng: 77.0792,
    nearestStationId: 'millennium-city-centre',
    distanceFromStationKm: 1.8,
    bestExitGate: 3,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 6,
        estimatedCostInr: 45,
        description: 'Quick auto ride through Sector 28/52 road to Ardee Mall main drop-off.'
      },
      {
        mode: 'e-rickshaw',
        durationMin: 8,
        estimatedCostInr: 20,
        description: 'Shared battery e-rickshaw towards Ardee City.'
      }
    ],
    introvertTips: [
      'Take Gate 3 at Millennium City Centre station.',
      'Features Marks & Spencer, Inox Megaplex, and The Big Chill Cafe.',
      'Much quieter and easier to navigate than the mega malls on NH-48.'
    ]
  },
  {
    id: 'aipl-joy-street',
    name: 'AIPL Joy Street, Sector 66',
    city: 'Gurgaon',
    category: 'Dining / Nightlife',
    lat: 28.3976,
    lng: 77.0602,
    nearestStationId: 'sector-55-56',
    distanceFromStationKm: 4.2,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 10,
        estimatedCostInr: 70,
        description: 'Auto from Sector 55-56 Rapid Metro down Badshahpur main corridor.'
      },
      {
        mode: 'cab',
        durationMin: 9,
        estimatedCostInr: 100,
        description: 'Uber/Ola cab to AIPL Joy Street high street plaza.'
      }
    ],
    introvertTips: [
      'Rapid Metro Sector 55-56 is the closest rail link.',
      'Vibrant colourful open-air concept with outdoor music, coffee shops, and boutique retail.',
      'Great for peaceful weekend brunches away from central city crowds.'
    ]
  },
  {
    id: 'leisure-valley-kod',
    name: 'Leisure Valley Park & Grounds, Sector 29',
    city: 'Gurgaon',
    category: 'Attraction / Market',
    lat: 28.4687,
    lng: 77.0628,
    nearestStationId: 'iffco-chowk',
    distanceFromStationKm: 0.6,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 6,
        estimatedCostInr: 0,
        description: 'Walk 600m from IFFCO Chowk Gate 1 through the leafy park avenue.'
      }
    ],
    introvertTips: [
      'A sprawling 25-acre green lung with jogging tracks, seasonal flower gardens, and musical fountains.',
      'Walking from IFFCO Chowk Gate 1 is very easy and avoids the traffic bottleneck near the highway.',
      'Ideal for quiet afternoon walks with headphones.'
    ]
  },
  {
    id: 'sadar-bazar-gurgaon',
    name: 'Sadar Bazar, Old Gurgaon (Heritage Food & Market)',
    city: 'Gurgaon',
    category: 'Attraction / Market',
    lat: 28.4623,
    lng: 77.0298,
    nearestStationId: 'iffco-chowk',
    distanceFromStationKm: 3.8,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 12,
        estimatedCostInr: 60,
        description: 'Auto from IFFCO Chowk directly to Sadar Bazar Post Office Chowk.'
      },
      {
        mode: 'e-rickshaw',
        durationMin: 15,
        estimatedCostInr: 25,
        description: 'Shared e-rickshaw plying from Old Railway Road.'
      }
    ],
    introvertTips: [
      'The authentic historic heart of Gurgaon before the tech boom.',
      'Must-visit for legendary Baljee jalebis, Rewri sweets, Pandit Ji paranthas, and wholesale spices.',
      'Ask the auto to drop you at the main entry gate; inside is best explored on foot.'
    ]
  },
  {
    id: 'candor-techspace-gurgaon',
    name: 'Candor TechSpace IT SEZ, Sector 48 (Sohna Rd)',
    city: 'Gurgaon',
    category: 'Tech Park / Hub',
    lat: 28.4230,
    lng: 77.0425,
    nearestStationId: 'millennium-city-centre',
    distanceFromStationKm: 4.9,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 12,
        estimatedCostInr: 80,
        description: 'Take auto from Millennium City Centre directly to Candor TechSpace Main Security Gate.'
      },
      {
        mode: 'cab',
        durationMin: 11,
        estimatedCostInr: 110,
        description: 'Uber/Ola cab to Candor TechSpace Tower A/B drop-off.'
      }
    ],
    introvertTips: [
      'Massive 25-acre tech SEZ campus hosting Sapient, Fidelity, Capgemini, and Wipro.',
      'Millennium City Centre has dedicated shared auto bays for Sector 48 IT corridor.',
      'Keep your corporate ID badge visible to breeze past the security barrier without questions.'
    ]
  },

  // --- DELHI-GURGAON BORDER & AIRPORT / TRANSIT HUBS ---
  {
    id: 'worldmark-aerocity',
    name: 'Worldmark Aerocity (Delhi Food Capital)',
    city: 'Delhi',
    category: 'Dining / Nightlife',
    lat: 28.5495,
    lng: 77.1215,
    nearestStationId: 'aerocity',
    distanceFromStationKm: 0.2,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 3,
        estimatedCostInr: 0,
        description: 'Exit Gate 1, cross the zebra crossing onto the Worldmark pedestrian plaza. Worldmark 1, 2, and 3 surround the plaza.'
      }
    ],
    introvertTips: [
      'Take the Airport Express Line (Orange Line). It is fast, air-conditioned, clean, and has luggage racks.',
      'Gate 1 opens directly opposite the Worldmark Aerocity commercial tower.',
      'Great for quiet cafe work, business meetings, or peaceful dinners away from typical city traffic.'
    ]
  },
  {
    id: 'igi-airport-terminal-3',
    name: 'IGI Airport Terminal 3 (International & Domestic)',
    city: 'Delhi',
    category: 'Tech Park / Hub',
    lat: 28.5562,
    lng: 77.0864,
    nearestStationId: 'igi-airport-t3',
    distanceFromStationKm: 0.1,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 2,
        estimatedCostInr: 0,
        description: 'Underground express elevators take you straight from the metro concourse up into Departures/Arrivals lobby!'
      }
    ],
    introvertTips: [
      'Airport Express connects New Delhi station to T3 in just 18 minutes, bypassing all NH-48 toll jams.',
      'Trolleys are available right outside the metro automated fare gates for free.',
      'Flight information display screens (FIDS) are mounted right on the metro concourse wall.'
    ]
  },
  {
    id: 'igi-airport-terminal-1',
    name: 'IGI Airport Terminal 1 (Domestic Departures)',
    city: 'Delhi',
    category: 'Tech Park / Hub',
    lat: 28.5672,
    lng: 77.1128,
    nearestStationId: 'terminal-1-igi',
    distanceFromStationKm: 0.1,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 2,
        estimatedCostInr: 0,
        description: 'Direct high-speed elevator and travellator from underground metro platform into T1 Departures Forecourt.'
      }
    ],
    introvertTips: [
      'Located directly on the Magenta Line (connects from Hauz Khas for Yellow Line riders).',
      'Follow the overhead yellow flight icons — no need to step outside onto the street at all.',
      'Baggage check-in counters are within 150m of the elevator exit.'
    ]
  },
  {
    id: 'yashobhoomi-iicc',
    name: 'Yashobhoomi (IICC Convention & Expo Centre, Dwarka)',
    city: 'Delhi',
    category: 'Tech Park / Hub',
    lat: 28.5539,
    lng: 77.0175,
    nearestStationId: 'yashobhoomi-dwarka',
    distanceFromStationKm: 0.05,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 1,
        estimatedCostInr: 0,
        description: 'Metro station concourse opens directly into the foyer of Yashobhoomi Convention Center.'
      }
    ],
    introvertTips: [
      'Connected via the newly extended Airport Express line straight to Dwarka Sector 25.',
      'India\'s largest convention and exhibition center (larger than Pragati Maidan Bharat Mandapam).',
      'Completely indoor, air-conditioned link from train to exhibition halls.'
    ]
  },
  {
    id: 'ambience-mall-vasant-kunj',
    name: 'Ambience Mall, Vasant Kunj',
    city: 'Delhi',
    category: 'Mall',
    lat: 28.5414,
    lng: 77.1551,
    nearestStationId: 'chhatarpur',
    distanceFromStationKm: 3.1,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 8,
        estimatedCostInr: 50,
        description: 'Autos queue at Chhatarpur Gate 2. Say "Ambience Mall Vasant Kunj" (fixed rate ~₹50).'
      },
      {
        mode: 'cab',
        durationMin: 7,
        estimatedCostInr: 75,
        description: 'Uber/Ola cab down Nelson Mandela Marg straight to Ambience Vasant Kunj drop-off.'
      }
    ],
    introvertTips: [
      'Take Chhatarpur station (Yellow Line), Exit Gate 2. Yellow Line connects directly from Gurgaon.',
      'Ambience Mall Vasant Kunj is situated on Nelson Mandela Marg right next to DLF Promenade and DLF Emporio.',
      'Hosts PVR Director\'s Cut, Uniqlo, Paul Bakery, and fine dining away from NH-48 highway traffic.'
    ]
  },
  {
    id: 'dlf-promenade-emporio-vasant-kunj',
    name: 'DLF Promenade & DLF Emporio, Vasant Kunj',
    city: 'Delhi',
    category: 'Mall',
    lat: 28.5422,
    lng: 77.1565,
    nearestStationId: 'chhatarpur',
    distanceFromStationKm: 3.2,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 8,
        estimatedCostInr: 50,
        description: 'Autos queue at Chhatarpur Gate 2. Say "DLF Promenade / Emporio Mall" (fixed rate ~₹50).'
      },
      {
        mode: 'cab',
        durationMin: 7,
        estimatedCostInr: 75,
        description: 'Uber/Ola cab down Nelson Mandela Marg straight to Emporio/Promenade main porch.'
      }
    ],
    introvertTips: [
      'Take Chhatarpur station (Yellow Line), Exit Gate 2.',
      'Emporio is India\'s pinnacle luxury shopping destination (Gucci, Louis Vuitton, Dior). Promenade hosts Zara, Sephora, and Smoke House Deli.',
      'Interconnected with Ambience Mall Vasant Kunj via outdoor pedestrian sidewalks.'
    ]
  },
  {
    id: 'ambience-mall-rohini',
    name: 'Ambience Mall, Rohini',
    city: 'Delhi',
    category: 'Mall',
    lat: 28.7190,
    lng: 77.1129,
    nearestStationId: 'kashmere-gate',
    distanceFromStationKm: 1.2,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'e-rickshaw',
        durationMin: 4,
        estimatedCostInr: 20,
        description: 'E-rickshaw from Rithala / Rohini West station directly to Swarn Jayanti Park / Ambience Mall Rohini.'
      }
    ],
    introvertTips: [
      'Located next to Swarn Jayanti (Japanese) Park in North-West Delhi.',
      'Accessible via Red Line (interchange at Kashmere Gate from Yellow Line).'
    ]
  },

  // --- SOUTH DELHI HOTSPOTS ---
  {
    id: 'select-citywalk-saket',
    name: 'Select CITYWALK & DLF Avenue, Saket',
    city: 'Delhi',
    category: 'Mall',
    lat: 28.5284,
    lng: 77.2191,
    nearestStationId: 'saket',
    distanceFromStationKm: 1.4,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 6,
        estimatedCostInr: 50,
        description: 'Step out of Gate 2. There is an official auto-rickshaw queue. Standard pre-agreed fare to Select CITYWALK is ₹50.'
      },
      {
        mode: 'cab',
        durationMin: 5,
        estimatedCostInr: 70,
        description: 'Set pickup pin at Saket Metro Gate 2. Uber Auto or Uber Go usually arrives in 2 minutes.'
      }
    ],
    introvertTips: [
      'Take Gate 2 at Saket station (Yellow Line).',
      'The auto drivers will shout "Citywalk! Citywalk!" — you can simply nod or show your Uber booking on your screen.',
      'Select CITYWALK, DLF Avenue, and MGF Metropolitan Saket are all clustered together in one walking campus.'
    ]
  },
  {
    id: 'champa-gali-saket',
    name: 'Champa Gali & Saidulajab (Bohemian Cafe Lane)',
    city: 'Delhi',
    category: 'Dining / Nightlife',
    lat: 28.5192,
    lng: 77.1994,
    nearestStationId: 'saket',
    distanceFromStationKm: 0.4,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 5,
        estimatedCostInr: 0,
        description: 'Exit Gate 1, walk 100m south, turn right into Lane 3 of Saidulajab village. Follow fairy lights to Champa Gali.'
      }
    ],
    introvertTips: [
      'Extremely close to Saket Metro Gate 1 (less than 5 minutes on foot).',
      'Hidden cobblestone lane draped with fairy lights, indie bookstores, and artisanal coffee roasters (Blue Tokai, Jugmug Thela).',
      'Very relaxed, low-pressure ambiance perfect for solo work or introverts with a book.'
    ]
  },
  {
    id: 'hauz-khas-social-village',
    name: 'Hauz Khas Village (HKV) & Fort',
    city: 'Delhi',
    category: 'Dining / Nightlife',
    lat: 28.5535,
    lng: 77.1945,
    nearestStationId: 'hauz-khas',
    distanceFromStationKm: 1.8,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 8,
        estimatedCostInr: 50,
        description: 'Autos are lined up at Gate 2. Shared auto ₹20 or private auto ₹50 to HKV entrance arch.'
      }
    ],
    introvertTips: [
      'Autos can only go up to the HKV entrance barrier/arch. After that, the entire village is pedestrian-only.',
      'Hauz Khas metro has both Yellow Line and Magenta Line interchange.',
      'Walk past the cafes to enter the 13th-century Hauz Khas Fort and Deer Park lake — peaceful and scenic.'
    ]
  },
  {
    id: 'dilli-haat-ina',
    name: 'Dilli Haat INA (Crafts & Regional State Cuisines)',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.5738,
    lng: 77.2078,
    nearestStationId: 'dilli-haat-ina',
    distanceFromStationKm: 0.05,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 1,
        estimatedCostInr: 0,
        description: 'Metro Gate 1 steps directly onto the entry courtyard and ticket counter of Dilli Haat!'
      }
    ],
    introvertTips: [
      'Zero auto/cab required: Dilli Haat - INA station Gate 1 is right at the ticket gate.',
      'Ticket is ₹30 for adults (pay via UPI QR at the window).',
      'Must-try food stalls: Momo stall at Sikkim, Litti Chokha at Bihar, Thali at Kashmir, Pao Bhaji at Maharashtra.'
    ]
  },
  {
    id: 'khan-market',
    name: 'Khan Market (Upscale Boutiques & Chic Cafes)',
    city: 'Delhi',
    category: 'Dining / Nightlife',
    lat: 28.5998,
    lng: 77.2275,
    nearestStationId: 'khan-market',
    distanceFromStationKm: 0.1,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 2,
        estimatedCostInr: 0,
        description: 'Exit Gate 1 on Violet Line, cross Humayun Road into Khan Market Middle Lane.'
      }
    ],
    introvertTips: [
      'India\'s most prestigious high street with Big Chill Cafe, Town Hall, Bahrisons Booksellers, and Perch Wine & Coffee Bar.',
      'If coming via Yellow Line, get off at Lok Kalyan Marg and take a ₹30 auto, or interchange to Violet Line at Central Secretariat.',
      'Compact U-shaped layout makes browsing bookstores and indie cafes very peaceful.'
    ]
  },
  {
    id: 'qutub-minar',
    name: 'Qutub Minar & Mehrauli Archaeological Park',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.5245,
    lng: 77.1855,
    nearestStationId: 'qutab-minar',
    distanceFromStationKm: 1.2,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'e-rickshaw',
        durationMin: 4,
        estimatedCostInr: 20,
        description: 'Electric rickshaws wait right outside Gate 1. Fixed ₹20/person straight to the monument ticket barrier.'
      },
      {
        mode: 'walk',
        durationMin: 14,
        estimatedCostInr: 0,
        description: 'Pleasant shaded walk along Anuvrat Marg to the main entrance.'
      }
    ],
    introvertTips: [
      'Book your monument entry ticket online via ASI website/QR code at the gate to skip the queue completely.',
      'Qutab Minar station is on the Yellow Line, just 4 stops from Gurgaon border (Guru Dronacharya).',
      'Nearby Mehrauli Archaeological Park (Jamali Kamali) is serene and uncrowded.'
    ]
  },
  {
    id: 'lodhi-garden-art-district',
    name: 'Lodhi Garden & Lodhi Open-Air Art District',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.5933,
    lng: 77.2197,
    nearestStationId: 'jor-bagh',
    distanceFromStationKm: 0.5,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 6,
        estimatedCostInr: 0,
        description: 'Walk 450m north along the tree-lined Lodhi Road directly into Lodhi Garden Gate 1.'
      }
    ],
    introvertTips: [
      'Take Yellow Line to Jor Bagh station, Exit Gate 2.',
      'Lodhi Garden has 90 acres of 15th-century Sayyid & Lodhi tombs surrounded by manicured lawns.',
      'Adjacent Lodhi Art District is India\'s first open-air public street art gallery with 50+ massive painted building murals.'
    ]
  },
  {
    id: 'sarojini-nagar-market',
    name: 'Sarojini Nagar Market (Fashion & Apparel Bargains)',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.5756,
    lng: 77.1978,
    nearestStationId: 'sarojini-nagar',
    distanceFromStationKm: 0.1,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 2,
        estimatedCostInr: 0,
        description: 'Gate 1 of Sarojini Nagar metro opens right into the heart of the apparel market lanes.'
      }
    ],
    introvertTips: [
      'Direct station on the Pink Line (or quick ₹30 auto from Dilli Haat - INA / AIIMS on Yellow Line).',
      'Delhi\'s undisputed capital for budget fashion, export surplus clothing, and accessories.',
      'Pro introvert tip: Visit on a weekday between 11 AM and 2 PM to avoid peak weekend crowds.'
    ]
  },
  {
    id: 'lajpat-nagar-market',
    name: 'Lajpat Nagar Central Market (Fabrics, Food & Ethnic Wear)',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.5682,
    lng: 77.2435,
    nearestStationId: 'dilli-haat-ina',
    distanceFromStationKm: 3.2,
    bestExitGate: 5,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 10,
        estimatedCostInr: 60,
        description: 'Direct auto from Dilli Haat - INA or ride Pink Line 2 stops to Lajpat Nagar station.'
      }
    ],
    introvertTips: [
      'Famous for street food (iconic Ram Laddu, Nagpal Chole Bhature, Dolma Aunty Momos) and ethnic fashion.',
      'Transfer at INA from Yellow to Pink Line, and de-board directly at Lajpat Nagar Gate 2.',
      'Clean wide central pedestrian street with ample seating.'
    ]
  },
  {
    id: 'sundar-nursery',
    name: 'Sundar Nursery & Humayun\'s Tomb (Heritage Eco Park)',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.5912,
    lng: 77.2438,
    nearestStationId: 'jln-stadium',
    distanceFromStationKm: 1.1,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 4,
        estimatedCostInr: 30,
        description: 'Quick ₹30 auto from JLN Stadium Gate 2 straight to Sundar Nursery main ticket arch.'
      },
      {
        mode: 'walk',
        durationMin: 12,
        estimatedCostInr: 0,
        description: 'Walk 1.1 km down Lodhi Road towards Nizamuddin heritage precinct.'
      }
    ],
    introvertTips: [
      'Often called Delhi\'s Central Park — 90 acres of restored Mughal monuments, lush water bodies, and bird sanctuaries.',
      'Hosts the famous weekend Earth Organic Farmers Market and lakeside artisan stalls.',
      'Incredibly peaceful and tranquil with zero blaring horns or crowds.'
    ]
  },
  {
    id: 'lotus-temple-delhi',
    name: 'Lotus Temple (Bahá\'í House of Worship)',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.5535,
    lng: 77.2588,
    nearestStationId: 'kalkaji-mandir',
    distanceFromStationKm: 0.6,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 7,
        estimatedCostInr: 0,
        description: 'Exit Gate 1 at Kalkaji Mandir, walk 600m along the paved footpath towards Lotus Temple visitor gate.'
      }
    ],
    introvertTips: [
      'De-board at Kalkaji Mandir (Magenta / Violet line interchange).',
      'The Lotus Temple interior is strictly silent — no talking, photography, or sermons allowed inside the central prayer hall!',
      'Ultimate sanctuary for introverts seeking absolute quiet and architectural beauty.'
    ]
  },

  // --- CENTRAL & OLD DELHI ICONS (DIRECT YELLOW LINE) ---
  {
    id: 'connaught-place-central-park',
    name: 'Connaught Place (CP) & Central Park',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.6315,
    lng: 77.2167,
    nearestStationId: 'rajiv-chowk',
    distanceFromStationKm: 0.05,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 1,
        estimatedCostInr: 0,
        description: 'Direct escalator exit into CP Inner Circle & Central Park. Absolutely zero cab or auto needed.'
      }
    ],
    introvertTips: [
      'Rajiv Chowk is Delhi\'s biggest metro hub with 8 gates. Gate 1 & 2 open right into the Inner Circle near Central Park.',
      'Use overhead color-coded signage inside the concourse to reach your desired gate without asking anyone.',
      'Inner Circle blocks are lettered A, B, C, D, E, F alphabetically clockwise.'
    ]
  },
  {
    id: 'janpath-tibetan-market',
    name: 'Janpath Market & Tibetan Market, CP',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.6256,
    lng: 77.2185,
    nearestStationId: 'rajiv-chowk',
    distanceFromStationKm: 0.3,
    bestExitGate: 5,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 4,
        estimatedCostInr: 0,
        description: 'Exit Rajiv Chowk Gate 5 or 6, walk 300m south down Janpath road directly to the market stalls.'
      }
    ],
    introvertTips: [
      'Take Gate 5 at Rajiv Chowk for the shortest walk to Janpath.',
      'Renowned for boho jewelry, brass idols, embroidered bags, vintage posters, and Tibetan shawls.',
      'Cafe 1911 and DePaul\'s legendary cold coffee are located right in the main street corridor.'
    ]
  },
  {
    id: 'india-gate-kartavya-path',
    name: 'India Gate & Kartavya Path',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.6129,
    lng: 77.2295,
    nearestStationId: 'central-secretariat',
    distanceFromStationKm: 1.2,
    bestExitGate: 3,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 14,
        estimatedCostInr: 0,
        description: 'Walk along the beautiful shaded Kartavya Path lawns directly facing India Gate.'
      },
      {
        mode: 'e-rickshaw',
        durationMin: 5,
        estimatedCostInr: 20,
        description: 'Eco-friendly e-rickshaws ply continuously from Gate 3 for ₹20 per passenger.'
      }
    ],
    introvertTips: [
      'Central Secretariat Gate 3 has an official DMRC signage map pointing towards Kartavya Path.',
      'Evening walks along the illuminated lawns and National War Memorial are very safe, peaceful, and well-lit.'
    ]
  },
  {
    id: 'chandni-chowk-heritage',
    name: 'Chandni Chowk & Paranthe Wali Gali (Old Delhi)',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.6578,
    lng: 77.2301,
    nearestStationId: 'chandni-chowk',
    distanceFromStationKm: 0.1,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 2,
        estimatedCostInr: 0,
        description: 'Exit Gate 1 directly onto the red sandstone pedestrianized Chandni Chowk heritage promenade.'
      }
    ],
    introvertTips: [
      'Direct stop on the Yellow Line from Gurgaon (no train changes needed!).',
      'Chandni Chowk is now completely pedestrianized between 9 AM and 9 PM — no cars or bikes allowed on the central street.',
      'Follow the stone signs to Paranthe Wali Gali (Gate 5) for deep-fried stuffed paranthas served with sweet pumpkin curry.'
    ]
  },
  {
    id: 'jama-masjid-matia-mahal',
    name: 'Jama Masjid & Matia Mahal Food Street (Karim\'s & Aslam)',
    city: 'Delhi',
    category: 'Dining / Nightlife',
    lat: 28.6506,
    lng: 77.2334,
    nearestStationId: 'chawri-bazar',
    distanceFromStationKm: 0.6,
    bestExitGate: 3,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 7,
        estimatedCostInr: 0,
        description: 'Exit Gate 3, walk down Chawri Bazar road past copper and paper shops straight to Jama Masjid Gate 1.'
      },
      {
        mode: 'e-rickshaw',
        durationMin: 4,
        estimatedCostInr: 20,
        description: 'Rickshaw from Chawri Bazar station straight to Karim\'s lane.'
      }
    ],
    introvertTips: [
      'Take Chawri Bazar station (Yellow Line). It is the deepest underground station in Delhi.',
      'Matia Mahal lane opposite Jama Masjid Gate 1 contains Karim\'s, Aslam Butter Chicken, and Kallan Nihari.',
      'Head to the rooftop restaurants for a sunset view over Old Delhi minarets.'
    ]
  },
  {
    id: 'red-fort-lal-qila',
    name: 'Red Fort (Lal Qila, UNESCO World Heritage)',
    city: 'Delhi',
    category: 'Attraction / Market',
    lat: 28.6562,
    lng: 77.2410,
    nearestStationId: 'chandni-chowk',
    distanceFromStationKm: 0.8,
    bestExitGate: 1,
    lastMileOptions: [
      {
        mode: 'walk',
        durationMin: 9,
        estimatedCostInr: 0,
        description: 'Walk straight down the pedestrianized Chandni Chowk street until you reach Lahori Gate of Red Fort.'
      }
    ],
    introvertTips: [
      'Walk east along Chandni Chowk from Gate 1 to approach the grand Lahori Gate.',
      'Purchase entry tickets online via QR code outside to skip the physical ticket queue.',
      'Evening sound and light show (Jai Hind) inside the fort is memorable and relaxed.'
    ]
  },
  {
    id: 'majnu-ka-tilla-mkt',
    name: 'Majnu Ka Tilla (Little Tibet / MKT - Laphing & AMA Cafe)',
    city: 'Delhi',
    category: 'Dining / Nightlife',
    lat: 28.7018,
    lng: 77.2282,
    nearestStationId: 'vidhan-sabha',
    distanceFromStationKm: 2.1,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'e-rickshaw',
        durationMin: 6,
        estimatedCostInr: 20,
        description: 'Exit Gate 2 at Vidhan Sabha. E-rickshaws line up shouting "Tibetan Colony" - ₹20 fixed price to the entrance footbridge.'
      },
      {
        mode: 'auto',
        durationMin: 5,
        estimatedCostInr: 50,
        description: 'Private auto from Vidhan Sabha to MKT Monastery Gate.'
      }
    ],
    introvertTips: [
      'Take Yellow Line to Vidhan Sabha. Just follow the university students to the e-rickshaw stand at Gate 2.',
      'Enter the serene pedestrian alleyways through the Tibetan monastery gate.',
      'Famous for authentic laphing (spicy cold noodles), AMA Cafe bakery & cheesecakes, and tranquil prayer wheels.'
    ]
  },

  // --- NOIDA CONNECTION ---
  {
    id: 'dlf-mall-of-india-noida',
    name: 'DLF Mall of India, Noida Sector 18',
    city: 'Noida',
    category: 'Mall',
    lat: 28.5678,
    lng: 77.3211,
    nearestStationId: 'botanical-garden',
    distanceFromStationKm: 1.6,
    bestExitGate: 2,
    lastMileOptions: [
      {
        mode: 'auto',
        durationMin: 6,
        estimatedCostInr: 50,
        description: 'Take auto to Sector 18 / Mall of India Gate 6. Fixed rate ~₹50.'
      },
      {
        mode: 'cab',
        durationMin: 5,
        estimatedCostInr: 70,
        description: 'Uber/Ola pickup from Botanical Garden Gate 2 bus bay.'
      }
    ],
    introvertTips: [
      'From Gurgaon, take Yellow Line to Hauz Khas, transfer to Magenta Line straight to Botanical Garden.',
      'Saves 45 minutes over road cabs in evening Delhi-Gurgaon traffic!',
      'India\'s largest shopping mall with 7 floors, indoor ski park, and 300+ global brands.'
    ]
  }
];

// Calculate Haversine distance in KM
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Find nearest metro station to any coordinate
export function findNearestMetroStation(lat: number, lng: number): { station: MetroStation; distanceKm: number } {
  let nearest: MetroStation = Object.values(METRO_STATIONS)[0];
  let minDistance = Infinity;

  for (const station of Object.values(METRO_STATIONS)) {
    const d = calculateDistance(lat, lng, station.lat, station.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = station;
    }
  }

  return { station: nearest, distanceKm: minDistance };
}

// Route breakdown result
export interface MultiModalTripPlan {
  origin: {
    name: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    lat: number;
    lng: number;
    category?: string;
  };
  originStation: MetroStation;
  destinationStation: MetroStation;
  firstMile: {
    mode: RideMode | 'auto_or_cab';
    distanceKm: number;
    durationMin: number;
    estimatedCostInr: number;
    instructions: string;
    antiAnxietyTip: string;
  };
  metroLeg: {
    boardStation: MetroStation;
    deboardStation: MetroStation;
    requiresTransfer: boolean;
    transferStation?: MetroStation;
    lines: {
      line: string;
      lineColor: string;
      from: string;
      to: string;
      direction: string;
      stopsCount: number;
    }[];
    totalStops: number;
    totalDurationMin: number;
    estimatedFareInr: number;
    transferInstruction?: string;
  };
  metroExit: {
    gateNumber: number;
    leadsTo: string;
    signageTip: string;
  };
  lastMile: {
    distanceKm: number;
    options: {
      mode: 'walk' | 'auto' | 'cab' | 'e-rickshaw';
      durationMin: number;
      estimatedCostInr: number;
      description: string;
    }[];
    exactInstructions: string;
    antiAnxietyTip: string;
  };
  introvertChecklist: string[];
  fareBreakdown: FareBreakdown;
  liveTraffic?: LiveTrafficInfo;
}

export type RideMode = 'cab' | 'auto' | 'e-rickshaw' | 'walk';

export interface FareBreakdown {
  totalEstimatedFareInr: number;
  passengerCount: number;
  firstMileMode: RideMode;
  firstMileCostInr: number;
  metroFarePerPersonInr: number;
  metroTotalFareInr: number;
  lastMileMode: RideMode;
  lastMileCostInr: number;
  firstMileOptions: {
    cab: number;
    auto: number;
    eRickshaw?: number;
    walk: number;
  };
  lastMileOptions: {
    cab: number;
    auto: number;
    eRickshaw?: number;
    walk: number;
  };
  directCabComparison?: {
    estimatedCostInr: number;
    durationMin: number;
    savingsInr: number;
    timeDiffMin: number;
  };
}

export interface LiveTrafficInfo {
  status: 'live' | 'estimated';
  trafficCondition: 'clear' | 'moderate' | 'heavy';
  firstMileDurationMin: number;
  firstMileDelayMin: number;
  metroDurationMin: number;
  lastMileDurationMin: number;
  lastMileDelayMin: number;
  totalDurationMin: number;
  firstMilePolyline?: string;
  lastMilePolyline?: string;
  directCabDurationMin?: number;
  lastUpdated?: string;
}

/**
 * Official DMRC distance slab fare calculator
 * Based on official distance-slab tariffs (0-2km: ₹10, 2-5km: ₹20, 5-12km: ₹30, 12-21km: ₹40, 21-32km: ₹50, >32km: ₹60)
 */
export function getDmrcDistanceFare(trackDistanceKm: number): number {
  if (trackDistanceKm <= 2) return 10;
  if (trackDistanceKm <= 5) return 20;
  if (trackDistanceKm <= 12) return 30;
  if (trackDistanceKm <= 21) return 40;
  if (trackDistanceKm <= 32) return 50;
  return 60;
}

/**
 * Highly accurate multi-network Delhi-NCR Metro Fare Calculator
 * Accounts for DMRC distance slabs, Rapid Metro flat ₹20 fare,
 * Sikanderpur interchange combined tickets, and Airport Express lines.
 */
export function calculateMetroFare(
  originStation?: { lat?: number; lng?: number; line?: string; name?: string } | null,
  destinationStation?: { lat?: number; lng?: number; line?: string; name?: string } | null,
  stopsCount: number = 8
): number {
  if (!originStation || !destinationStation) {
    return calculateDmrcMetroFare(stopsCount);
  }

  const oLine = originStation.line || '';
  const dLine = destinationStation.line || '';

  // 1. Pure Rapid Metro trip (within Gurugram, e.g. Cyber City to Moulsari / Sector 55-56)
  if (oLine === 'Rapid Metro' && dLine === 'Rapid Metro') {
    return 20; // Official flat fare for Rapid Metro Gurugram
  }

  // 2. Airport Express Line
  if (oLine === 'Airport Express' || dLine === 'Airport Express') {
    const isShortAerocity =
      (originStation.name?.includes('Aerocity') && destinationStation.name?.includes('Airport')) ||
      (destinationStation.name?.includes('Aerocity') && originStation.name?.includes('Airport'));
    return isShortAerocity ? 20 : 60;
  }

  // 3. Rapid Metro <-> DMRC Interchange (via Sikanderpur)
  const hasRapid = oLine === 'Rapid Metro' || dLine === 'Rapid Metro';
  const hasDmrc = oLine !== 'Rapid Metro' || dLine !== 'Rapid Metro';

  if (hasRapid && hasDmrc) {
    const dmrcStation = oLine !== 'Rapid Metro' ? originStation : destinationStation;
    // Sikanderpur station coordinates: 28.4819, 77.0928
    const distToSikanderpur = dmrcStation.lat && dmrcStation.lng
      ? calculateDistance(dmrcStation.lat, dmrcStation.lng, 28.4819, 77.0928) * 1.28
      : 14;
    const dmrcLegFare = getDmrcDistanceFare(distToSikanderpur);
    // DMRC distance fare + Rapid Metro ₹20 surcharge ticket
    return Math.min(80, dmrcLegFare + 20);
  }

  // 4. Standard DMRC Network (Yellow, Blue, Magenta, Pink, Violet, Red, Green)
  if (originStation.lat && originStation.lng && destinationStation.lat && destinationStation.lng) {
    const straightDist = calculateDistance(
      originStation.lat,
      originStation.lng,
      destinationStation.lat,
      destinationStation.lng
    );
    // Track winding factor (metro tracks follow road curves ~1.28x straight line)
    const trackDistKm = Math.max(1, straightDist * 1.28);
    return getDmrcDistanceFare(trackDistKm);
  }

  // Fallback to stop-based slab
  return calculateDmrcMetroFare(stopsCount);
}

// Backward-compatible export
export function calculateDmrcMetroFare(stops: number): number {
  if (stops <= 2) return 10;
  if (stops <= 4) return 20;
  if (stops <= 9) return 30;
  if (stops <= 16) return 40;
  if (stops <= 24) return 50;
  return 60;
}

// Realistic Delhi-NCR ride-hailing market rates (Uber Go, Uber Auto, Rapido, Street Auto)
// Calibrated to real-world ground truth (cab min ₹150, auto min ₹90)
export function estimateRideHailingFares(roadDistanceKm: number, durationMin: number) {
  const dist = Math.max(0.5, roadDistanceKm);
  const time = Math.max(5, durationMin);

  // Uber Go / Ola Mini / InDrive Cab:
  // Base fare: ₹90, ₹16/km, ₹2.0/min in traffic.
  // Standard NCR minimum fare for cab bookings is ₹140 - ₹150 (short trips to/from metro are ₹140-₹160).
  const cab = Math.max(150, Math.round(90 + dist * 16 + time * 2.0));

  // Uber Auto / Rapido Auto / Street Auto:
  // Base fare: ₹45, ₹13/km, ₹1.5/min in traffic.
  // NCR auto drivers / Uber Auto minimum is ₹80 - ₹95 (Gurgaon autos rarely accept under ₹90-₹100).
  const auto = Math.max(90, Math.round(45 + Math.max(0, dist - 1.5) * 13 + time * 1.5));

  // Rapido Bike / Uber Moto:
  // Base ₹30 + ₹9/km, minimum ₹50.
  const bike = Math.max(50, Math.round(30 + dist * 9));

  // Shared E-Rickshaw / Metro Feeder: ₹15 for <= 1.8km, ₹25 for <= 3.5km (per seat)
  const eRickshaw = dist <= 3.5 ? (dist <= 1.8 ? 15 : 25) : undefined;

  return { cab, auto, bike, eRickshaw, walk: 0 };
}

// Compute comprehensive trip plan
export function planMultiModalTrip(
  originName: string,
  originLat: number,
  originLng: number,
  destName: string,
  destLat: number,
  destLng: number,
  knownDestination?: FamousDestination,
  passengerCount: number = 1,
  firstMileModeOverride?: RideMode,
  lastMileModeOverride?: RideMode
): MultiModalTripPlan {
  const originStationMatch = findNearestMetroStation(originLat, originLng);
  const destStationMatch = knownDestination
    ? { station: METRO_STATIONS[knownDestination.nearestStationId] || findNearestMetroStation(destLat, destLng).station, distanceKm: knownDestination.distanceFromStationKm }
    : findNearestMetroStation(destLat, destLng);

  const oStation = originStationMatch.station;
  const dStation = destStationMatch.station;

  // First mile calculations
  const isFirstMileWalkable = originStationMatch.distanceKm <= 0.8;
  const firstMileRoadDist = Math.round(originStationMatch.distanceKm * 1.25 * 10) / 10;
  // Realistic urban road speed in Delhi-NCR (~18-20 km/h) + 5m cab/auto dispatch & wait buffer
  const firstMileRoadDurationMin = Math.max(10, Math.round(firstMileRoadDist * 3.4) + 5);
  const firstMileWalkDurationMin = Math.max(3, Math.round(originStationMatch.distanceKm * 13));
  const firstMileFareOptions = estimateRideHailingFares(firstMileRoadDist, firstMileRoadDurationMin);

  const selectedFirstMileMode: RideMode = firstMileModeOverride || (isFirstMileWalkable ? 'walk' : 'auto');
  const selectedFirstMileCost =
    selectedFirstMileMode === 'walk'
      ? 0
      : selectedFirstMileMode === 'cab'
      ? firstMileFareOptions.cab
      : selectedFirstMileMode === 'e-rickshaw' && firstMileFareOptions.eRickshaw
      ? firstMileFareOptions.eRickshaw * passengerCount
      : firstMileFareOptions.auto;

  const firstMileDurationMin =
    selectedFirstMileMode === 'walk' ? firstMileWalkDurationMin : firstMileRoadDurationMin;

  const firstMile = {
    mode: selectedFirstMileMode,
    distanceKm: originStationMatch.distanceKm,
    durationMin: firstMileDurationMin,
    estimatedCostInr: selectedFirstMileCost,
    instructions: isFirstMileWalkable
      ? `Walk approximately ${originStationMatch.distanceKm} km directly to ${oStation.name} metro station.`
      : `Take a ${selectedFirstMileMode === 'cab' ? 'cab' : 'quick auto'} (~${firstMileRoadDist} km) to ${oStation.name} Metro Station.`,
    antiAnxietyTip: isFirstMileWalkable
      ? 'Look for the standard overhead blue/red DMRC logo sign as you approach.'
      : 'Book via Uber Auto or Rapido so you do not have to negotiate fare or explain directions to anyone.'
  };

  // Determine metro lines and transfers
  const isSameLine = oStation.line === dStation.line;
  let requiresTransfer = false;
  let transferStation: MetroStation | undefined = undefined;
  const lines: MultiModalTripPlan['metroLeg']['lines'] = [];

  if (isSameLine) {
    lines.push({
      line: oStation.line,
      lineColor: oStation.lineColor,
      from: oStation.name,
      to: dStation.name,
      direction: getLineDirection(oStation, dStation),
      stopsCount: estimateStopsCount(oStation, dStation)
    });
  } else {
    // Rapid Metro <-> Yellow Line: Sikanderpur
    if (
      (oStation.line === 'Rapid Metro' && dStation.line === 'Yellow') ||
      (oStation.line === 'Yellow' && dStation.line === 'Rapid Metro')
    ) {
      requiresTransfer = true;
      transferStation = METRO_STATIONS['sikanderpur-yellow'];
      lines.push({
        line: oStation.line,
        lineColor: oStation.lineColor,
        from: oStation.name,
        to: 'Sikanderpur',
        direction: oStation.line === 'Rapid Metro' ? 'Towards Sikanderpur' : 'Towards Samaypur Badli',
        stopsCount: 3
      });
      lines.push({
        line: dStation.line,
        lineColor: dStation.lineColor,
        from: 'Sikanderpur',
        to: dStation.name,
        direction: dStation.line === 'Rapid Metro' ? 'Towards Cyber City / Moulsari' : 'Towards Millennium City Centre / Kashmere Gate',
        stopsCount: estimateStopsCount(METRO_STATIONS['sikanderpur-yellow'], dStation)
      });
    } else if (
      (oStation.line === 'Yellow' && dStation.line === 'Magenta') ||
      (oStation.line === 'Magenta' && dStation.line === 'Yellow')
    ) {
      requiresTransfer = true;
      transferStation = METRO_STATIONS['hauz-khas'];
      lines.push({
        line: oStation.line,
        lineColor: oStation.lineColor,
        from: oStation.name,
        to: 'Hauz Khas',
        direction: 'Towards Hauz Khas',
        stopsCount: 4
      });
      lines.push({
        line: dStation.line,
        lineColor: dStation.lineColor,
        from: 'Hauz Khas',
        to: dStation.name,
        direction: 'Towards Botanical Garden / Janakpuri West',
        stopsCount: 5
      });
    } else {
      requiresTransfer = true;
      transferStation = METRO_STATIONS['sikanderpur-yellow'];
      lines.push({
        line: oStation.line,
        lineColor: oStation.lineColor,
        from: oStation.name,
        to: 'Interchange Station',
        direction: 'Towards Central Line',
        stopsCount: 4
      });
      lines.push({
        line: dStation.line,
        lineColor: dStation.lineColor,
        from: 'Interchange Station',
        to: dStation.name,
        direction: `Towards ${dStation.name}`,
        stopsCount: 4
      });
    }
  }

  const totalStops = lines.reduce((acc, l) => acc + l.stopsCount, 0);
  // Realistic metro time: train travel (2.4m/stop) + security frisking & bag scan (4m) + platform headway wait (3m) + transfer walk (6m if interchange) + exit (3m)
  const metroTransitDurationMin = Math.round(totalStops * 2.4 + (requiresTransfer ? 6 : 0) + 10);
  const metroFarePerPersonInr = calculateMetroFare(oStation, dStation, totalStops);
  const metroTotalFareInr = metroFarePerPersonInr * Math.max(1, passengerCount);

  // Destination station exit details
  const exitInfo = dStation.exitGates[0] || {
    gateNumber: 1,
    leadsTo: destName,
    tip: 'Follow the station exit signs.'
  };

  const gateNumber = knownDestination ? knownDestination.bestExitGate : exitInfo.gateNumber;
  const leadsTo = knownDestination ? `Towards ${destName}` : exitInfo.leadsTo;

  // Last mile
  const lastMileDistance = destStationMatch.distanceKm;
  const isLastMileWalkable = lastMileDistance <= 0.6;
  const lastMileRoadDist = Math.round(lastMileDistance * 1.25 * 10) / 10;
  // Live urban road travel + 4m station exit & driver pickup buffer
  const lastMileRoadDurationMin = Math.max(8, Math.round(lastMileRoadDist * 3.4) + 4);
  const lastMileWalkDurationMin = Math.max(3, Math.round(lastMileDistance * 13));
  const lastMileFareOptions = estimateRideHailingFares(lastMileRoadDist, lastMileRoadDurationMin);

  const selectedLastMileMode: RideMode = lastMileModeOverride || (isLastMileWalkable ? 'walk' : 'auto');
  const selectedLastMileCost =
    selectedLastMileMode === 'walk'
      ? 0
      : selectedLastMileMode === 'cab'
      ? lastMileFareOptions.cab
      : selectedLastMileMode === 'e-rickshaw' && lastMileFareOptions.eRickshaw
      ? lastMileFareOptions.eRickshaw * passengerCount
      : lastMileFareOptions.auto;

  const lastMileDurationMin =
    selectedLastMileMode === 'walk' ? lastMileWalkDurationMin : lastMileRoadDurationMin;

  const lastMile = {
    distanceKm: lastMileDistance,
    options: knownDestination?.lastMileOptions || [
      {
        mode: (isLastMileWalkable ? 'walk' : 'auto') as 'walk' | 'auto',
        durationMin: isLastMileWalkable ? lastMileWalkDurationMin : lastMileRoadDurationMin,
        estimatedCostInr: isLastMileWalkable ? 0 : lastMileFareOptions.auto,
        description: isLastMileWalkable
          ? `Walk ${lastMileDistance} km directly to ${destName}.`
          : `Take an auto from outside Gate ${gateNumber} to ${destName}.`
      }
    ],
    exactInstructions: knownDestination
      ? knownDestination.lastMileOptions[0]?.description || `Exit Gate ${gateNumber} and proceed to destination.`
      : `Deboard at ${dStation.name}, follow signs for Gate ${gateNumber}, and take an auto or short walk (${lastMileDistance} km).`,
    antiAnxietyTip: knownDestination?.introvertTips[0] ||
      `At ${dStation.name}, look up at the green illuminated overhead sign for Gate ${gateNumber}. Auto stands are stationed directly at street level.`
  };

  const introvertChecklist = [
    'No verbal ticketing needed: Use DMRC WhatsApp QR ticket (send "Hi" to +91 96508 55800) or Paytm App -> Metro Tickets.',
    'Security Check: Keep your backpack unzipped in advance for a 5-second bag scan; no talking required.',
    requiresTransfer
      ? `Interchange at ${transferStation?.name || 'interchange'}: Follow the colored overhead ceiling signs painted with arrows on the floor. Do not exit fare gates!`
      : 'Stay inside the train until station announcements call your stop (also displayed on LED screens above train doors).',
    `Exit confidently: Head straight for Exit Gate ${gateNumber} using overhead arrow signs.`,
    'Last Mile ride: Open Uber / Rapido while exiting the metro escalator so your auto/cab is arriving right as you reach the street gate.'
  ];

  // Total End-to-End Fare
  const totalEstimatedFareInr = selectedFirstMileCost + metroTotalFareInr + selectedLastMileCost;

  // Direct road ride comparison (origin all the way to destination by cab in NCR traffic)
  const directDistanceStraight = calculateDistance(originLat, originLng, destLat, destLng);
  const directRoadDistance = Math.round(directDistanceStraight * 1.35 * 10) / 10;
  const directDrivingTimeMin = Math.max(35, Math.round(directRoadDistance * 3.8) + 8);
  const directCabFare = estimateRideHailingFares(directRoadDistance, directDrivingTimeMin).cab;
  const totalTripDurationMin = Math.round(firstMileDurationMin + metroTransitDurationMin + lastMileDurationMin);

  const fareBreakdown: FareBreakdown = {
    totalEstimatedFareInr,
    passengerCount: Math.max(1, passengerCount),
    firstMileMode: selectedFirstMileMode,
    firstMileCostInr: selectedFirstMileCost,
    metroFarePerPersonInr,
    metroTotalFareInr,
    lastMileMode: selectedLastMileMode,
    lastMileCostInr: selectedLastMileCost,
    firstMileOptions: {
      cab: firstMileFareOptions.cab,
      auto: firstMileFareOptions.auto,
      eRickshaw: firstMileFareOptions.eRickshaw,
      walk: 0
    },
    lastMileOptions: {
      cab: lastMileFareOptions.cab,
      auto: lastMileFareOptions.auto,
      eRickshaw: lastMileFareOptions.eRickshaw,
      walk: 0
    },
    directCabComparison: {
      estimatedCostInr: directCabFare,
      durationMin: directDrivingTimeMin,
      savingsInr: Math.max(0, directCabFare - totalEstimatedFareInr),
      timeDiffMin: directDrivingTimeMin - totalTripDurationMin
    }
  };

  return {
    origin: {
      name: originName,
      lat: originLat,
      lng: originLng
    },
    destination: {
      name: destName,
      lat: destLat,
      lng: destLng,
      category: knownDestination?.category
    },
    originStation: oStation,
    destinationStation: dStation,
    firstMile,
    metroLeg: {
      boardStation: oStation,
      deboardStation: dStation,
      requiresTransfer,
      transferStation,
      lines,
      totalStops,
      totalDurationMin: Math.round(metroTransitDurationMin),
      estimatedFareInr: metroFarePerPersonInr,
      transferInstruction: requiresTransfer
        ? `Change trains at ${transferStation?.name || 'Sikanderpur'}. Walk through the dedicated connecting skybridge. You do NOT need to buy a new token or exit the gates.`
        : undefined
    },
    metroExit: {
      gateNumber,
      leadsTo,
      signageTip: `Look for overhead ceiling signage marking "Gate ${gateNumber} - ${leadsTo}".`
    },
    lastMile,
    introvertChecklist,
    fareBreakdown
  };
}

function getLineDirection(o: MetroStation, d: MetroStation): string {
  if (o.line === 'Yellow') {
    return d.lat < o.lat ? 'Towards Millennium City Centre (Gurugram)' : 'Towards Samaypur Badli (Delhi)';
  }
  if (o.line === 'Rapid Metro') {
    return 'Towards Cyber City / Moulsari Avenue';
  }
  return `Towards ${d.name}`;
}

function estimateStopsCount(o: MetroStation, d: MetroStation): number {
  const dist = calculateDistance(o.lat, o.lng, d.lat, d.lng);
  return Math.max(1, Math.min(18, Math.round(dist / 1.4)));
}
