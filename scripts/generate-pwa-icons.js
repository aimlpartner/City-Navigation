const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create directories
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Standard Squircle SVG (for regular icons, favicon, apple-touch-icon)
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16392c" />
      <stop offset="100%" stop-color="#102a20" />
    </linearGradient>
  </defs>
  <!-- Squircle rounded background matching the user image -->
  <rect width="512" height="512" rx="120" ry="120" fill="url(#bgGrad)" />
  <!-- Train Front Icon centered -->
  <g transform="translate(126, 126) scale(10.8333)" fill="none" stroke="#5ee9b5" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
    <path d="m9 15-1-1" />
    <path d="m15 15 1-1" />
    <path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" />
    <path d="m8 19-2 3" />
    <path d="m16 19 2 3" />
  </g>
</svg>`;

// Maskable Full-bleed SVG (for Android adaptive icons with 20% safe zone padding)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16392c" />
      <stop offset="100%" stop-color="#102a20" />
    </linearGradient>
  </defs>
  <!-- Full bleed background for OS masking -->
  <rect width="512" height="512" fill="url(#bgGrad)" />
  <!-- Train Front Icon centered in safe zone -->
  <g transform="translate(148, 148) scale(9)" fill="none" stroke="#5ee9b5" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
    <path d="m9 15-1-1" />
    <path d="m15 15 1-1" />
    <path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" />
    <path d="m8 19-2 3" />
    <path d="m16 19 2 3" />
  </g>
</svg>`;

async function generate() {
  // Save SVGs
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), standardSvg, 'utf8');
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), maskableSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardSvg, 'utf8');

  // Generate 512x512 standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));

  // Generate 192x192 standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));

  // Generate 512x512 maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  // Generate 192x192 maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));

  // Generate 180x180 Apple touch icon
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  // Generate 32x32 & 48x48 favicons
  await sharp(Buffer.from(standardSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  await sharp(Buffer.from(standardSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('All PWA icons generated successfully in public/ and public/icons/!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
