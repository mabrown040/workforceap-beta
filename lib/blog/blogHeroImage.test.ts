import assert from 'node:assert/strict';
import { resolveBlogHeroImage } from '@/lib/blog/blogHeroImage';
import { getDefaultImage } from '@/lib/blog/defaultImages';

assert.deepEqual(
  resolveBlogHeroImage('/images/post.webp', 'News', 'post'),
  { src: '/images/post.webp', alt: 'Cover image for post' },
  'single-slash local image paths should pass through',
);

assert.deepEqual(
  resolveBlogHeroImage('//attacker.example/pixel.png', 'News', 'post'),
  {
    src: getDefaultImage('News', 'post').url,
    alt: getDefaultImage('News', 'post').alt,
  },
  'protocol-relative remote images should fall back to the default image',
);

console.log('blogHeroImage tests passed');
