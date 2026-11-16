// Photo rules for 25 common documents, from the official sources tracked by visaphotos.app.
// Pixel sizes for printed photos are the 300 DPI equivalent; a larger photo with the same shape is fine.
// The full list (151 documents, with sources and check dates) is at https://visaphotos.app/countries
//
// bg: "white" (white or off-white only), "notWhite" (light, but not white), "light" (any plain light colour)
// head: head height (top of hair to chin) as % of photo height, when the authority publishes it.

const SITE = 'https://visaphotos.app';

export const SPECS = [
  { id: 'us-visa', name: 'United States visa (DS-160)', w: 600, h: 600, maxPx: 1200, maxKb: 240, bg: 'white', head: [50, 69], path: '/united-states/visa-photo' },
  { id: 'us-passport', name: 'United States passport', w: 600, h: 600, minKb: 54, bg: 'white', head: [50, 69], path: '/united-states/passport-photo' },
  { id: 'us-dv-lottery', name: 'United States DV lottery', w: 600, h: 600, maxPx: 600, maxKb: 240, bg: 'white', head: [50, 69], path: '/united-states/dv-lottery-photo' },
  { id: 'us-green-card', name: 'United States green card (I-485)', w: 600, h: 600, bg: 'white', head: [50, 69], path: '/united-states/green-card-photo' },
  { id: 'us-ead', name: 'United States work permit (EAD, I-765)', w: 600, h: 600, bg: 'white', head: [50, 69], path: '/united-states/ead-photo' },
  { id: 'uk-passport-online', name: 'United Kingdom passport (online)', w: 600, h: 750, minKb: 50, maxKb: 10000, bg: 'light', path: '/united-kingdom/passport-online-photo' },
  { id: 'uk-visa', name: 'United Kingdom visa', w: 600, h: 750, minKb: 50, maxKb: 6000, bg: 'light', path: '/united-kingdom/visa-photo' },
  { id: 'canada-passport', name: 'Canada passport', w: 591, h: 827, bg: 'light', head: [44.3, 51.4], path: '/canada/passport-photo' },
  { id: 'canada-visa', name: 'Canada visa / permanent residence', w: 413, h: 531, bg: 'light', head: [68.9, 80], path: '/canada/visa-photo' },
  { id: 'canada-pr-card-online', name: 'Canada PR card (online)', w: 1000, h: 1400, maxKb: 4000, bg: 'white', head: [44.3, 51.4], path: '/canada/pr-card-online-photo' },
  { id: 'australia-passport', name: 'Australia passport', w: 413, h: 531, bg: 'light', head: [71.1, 80], path: '/australia/passport-photo' },
  { id: 'new-zealand-visa', name: 'New Zealand visa (online)', w: 900, h: 1200, minKb: 512, maxKb: 3000, bg: 'light', head: [70, 80], path: '/new-zealand/visa-photo' },
  { id: 'ireland-passport-online', name: 'Ireland passport (online)', w: 715, h: 951, maxKb: 9000, bg: 'light', path: '/ireland/passport-online-photo' },
  { id: 'india-passport', name: 'India passport', w: 630, h: 810, bg: 'white', head: [80, 85], path: '/india/passport-photo' },
  { id: 'india-oci', name: 'India OCI card', w: 600, h: 600, minPx: 200, maxPx: 900, maxKb: 200, bg: 'notWhite', path: '/india/oci-photo' },
  { id: 'india-visa', name: 'India e-Visa', w: 600, h: 600, minKb: 10, maxKb: 1000, bg: 'light', path: '/india/visa-photo' },
  { id: 'india-pan-card', name: 'India PAN card (Protean/NSDL)', w: 197, h: 276, maxKb: 20, bg: 'white', path: '/india/pan-card-photo' },
  { id: 'pakistan-visa', name: 'Pakistan visa', w: 413, h: 531, maxKb: 350, bg: 'white', head: [70, 80], path: '/pakistan/visa-photo' },
  { id: 'china-visa', name: 'China visa', w: 385, h: 560, minKb: 40, maxKb: 120, bg: 'white', head: [58.3, 68.8], path: '/china/visa-photo' },
  { id: 'schengen-visa', name: 'Schengen visa', w: 413, h: 531, bg: 'light', head: [70, 80], path: '/schengen/visa-photo' },
  { id: 'germany-passport', name: 'Germany passport', w: 413, h: 531, bg: 'light', head: [70, 80], path: '/germany/passport-photo' },
  { id: 'japan-visa', name: 'Japan visa', w: 413, h: 531, bg: 'light', path: '/japan/visa-photo' },
  { id: 'philippines-passport', name: 'Philippines passport', w: 413, h: 531, bg: 'white', path: '/philippines/passport-photo' },
  { id: 'brazil-visa', name: 'Brazil visa', w: 413, h: 531, bg: 'white', path: '/brazil/visa-photo' },
  { id: 'nigeria-passport-online', name: 'Nigeria passport (online)', w: 600, h: 800, maxKb: 2000, bg: 'white', path: '/nigeria/passport-online-photo' },
];

/** Link to the full maker for a document, tagged so visits from these tools can be counted. */
export const makerUrl = (spec, tool) =>
  `${SITE}${spec ? spec.path : '/'}?utm_source=github&utm_medium=referral&utm_campaign=${tool}`;

export const siteUrl = (tool) => `${SITE}/?utm_source=github&utm_medium=referral&utm_campaign=${tool}`;
