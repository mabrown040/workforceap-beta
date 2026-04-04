type DefaultImage = {
  url: string;
  alt: string;
  credit: string;
};

const pools: Record<string, DefaultImage[]> = {
  'Career Tips': [
    { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', alt: 'Professional in business attire', credit: 'Hunters Race' },
    { url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80', alt: 'Team collaborating at a table', credit: 'Annie Spratt' },
    { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', alt: 'Person working on laptop with notes', credit: 'Helloquence' },
    { url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80', alt: 'Confident professional smiling', credit: 'Christina Morillo' },
    { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80', alt: 'Group of people learning together', credit: 'Brooke Cagle' },
  ],
  'Program Spotlight': [
    { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80', alt: 'Laptop with code on screen', credit: 'Clément Hélardot' },
    { url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80', alt: 'Classroom training session', credit: 'You X Ventures' },
    { url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80', alt: 'Person using technology for learning', credit: 'ThisisEngineering' },
    { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80', alt: 'Digital learning environment', credit: 'Chris Montgomery' },
    { url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&q=80', alt: 'Computer screen with data', credit: 'Luca Bravo' },
  ],
  Local: [
    { url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80', alt: 'City downtown aerial view', credit: 'Pedro Lastra' },
    { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', alt: 'Local community gathering space', credit: 'Jason Leung' },
    { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80', alt: 'Modern office in urban setting', credit: 'Austin Distel' },
    { url: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=800&q=80', alt: 'Community members at local event', credit: 'Priscilla Du Preez' },
    { url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80', alt: 'Downtown buildings and street', credit: 'Jezael Melgoza' },
  ],
  'Success Stories': [
    { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', alt: 'Team celebrating a win', credit: 'Jason Goodman' },
    { url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', alt: 'Graduates tossing caps in the air', credit: 'Vasily Koloda' },
    { url: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=800&q=80', alt: 'Professional shaking hands', credit: 'Cytonn Photography' },
    { url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80', alt: 'Diverse team working together', credit: 'Annie Spratt' },
    { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80', alt: 'People using laptops at desks', credit: 'Marvin Meyer' },
  ],
  News: [
    { url: 'https://images.unsplash.com/photo-1504711434969-e33886168d3c?w=800&q=80', alt: 'Newspaper and coffee', credit: 'Roman Kraft' },
    { url: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80', alt: 'News on a digital screen', credit: 'Markus Winkler' },
    { url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80', alt: 'Conference presentation', credit: 'Product School' },
    { url: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=800&q=80', alt: 'Data dashboard on monitor', credit: 'Stephen Dawson' },
    { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80', alt: 'Press microphones at event', credit: 'Antenna' },
  ],
  General: [
    { url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80', alt: 'Students studying together', credit: 'Priscilla Du Preez' },
    { url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80', alt: 'Person writing in notebook', credit: 'Green Chameleon' },
    { url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80', alt: 'Workshop with laptops open', credit: 'John Schnobrich' },
    { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80', alt: 'Business meeting in progress', credit: 'Austin Distel' },
    { url: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800&q=80', alt: 'People collaborating on whiteboard', credit: 'Mimi Thian' },
  ],
};

/** Simple string hash that returns a positive integer. */
function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) - h + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Deterministically pick an image for a blog post based on its category and slug.
 * Falls back to the General pool when the category is unrecognised.
 */
export function getDefaultImage(
  category: string | null | undefined,
  slug: string | null | undefined,
): DefaultImage {
  const pool = pools[category ?? ''] ?? pools['General'];
  const index = hashSlug(slug ?? '') % pool.length;
  return pool[index];
}

/** Return every pool (keyed by category name). */
export function getAllDefaultImages(): Record<string, DefaultImage[]> {
  return pools;
}
