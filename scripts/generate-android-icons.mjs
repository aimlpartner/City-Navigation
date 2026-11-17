import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
const publicIconsDir = path.join(rootDir, 'public', 'icons');

const iconSvgPath = path.join(publicIconsDir, 'icon.svg');
const maskableSvgPath = path.join(publicIconsDir, 'icon-maskable.svg');

if (!fs.existsSync(iconSvgPath) || !fs.existsSync(maskableSvgPath)) {
  throw new Error('Missing public/icons/icon.svg or icon-maskable.svg');
}

const iconSvg = fs.readFileSync(iconSvgPath, 'utf8');
const maskableSvg = fs.readFileSync(maskableSvgPath, 'utf8');

// Transparent foreground SVG preserving exact MetroNav train geometry inside Android 66% safe zone
const foregroundOnlySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(148, 148) scale(9)" fill="none" stroke="#5ee9b5" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
    <path d="m9 15-1-1" />
    <path d="m15 15 1-1" />
    <path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" />
    <path d="m8 19-2 3" />
    <path d="m16 19 2 3" />
  </g>
</svg>`;

// Circular-clipped variant for legacy ic_launcher_round.png
const roundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16392c" />
      <stop offset="100%" stop-color="#102a20" />
    </linearGradient>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="244" />
    </clipPath>
  </defs>
  <g clip-path="url(#circleClip)">
    <rect width="512" height="512" fill="url(#bgGrad)" />
    <g transform="translate(148, 148) scale(9)" fill="none" stroke="#5ee9b5" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
      <path d="m9 15-1-1" />
      <path d="m15 15 1-1" />
      <path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" />
      <path d="m8 19-2 3" />
      <path d="m16 19 2 3" />
    </g>
  </g>
</svg>`;

const launcherDensities = [
  { name: 'mipmap-mdpi', legacy: 48, adaptive: 108 },
  { name: 'mipmap-hdpi', legacy: 72, adaptive: 162 },
  { name: 'mipmap-xhdpi', legacy: 96, adaptive: 216 },
  { name: 'mipmap-xxhdpi', legacy: 144, adaptive: 324 },
  { name: 'mipmap-xxxhdpi', legacy: 192, adaptive: 432 },
];

const splashSizes = [
  { dir: 'drawable', width: 480, height: 800, iconSize: 168 },
  { dir: 'drawable-port-mdpi', width: 320, height: 480, iconSize: 120 },
  { dir: 'drawable-port-hdpi', width: 480, height: 800, iconSize: 168 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 1280, iconSize: 240 },
  { dir: 'drawable-port-xxhdpi', width: 960, height: 1600, iconSize: 320 },
  { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920, iconSize: 400 },
  { dir: 'drawable-land-mdpi', width: 480, height: 320, iconSize: 112 },
  { dir: 'drawable-land-hdpi', width: 800, height: 480, iconSize: 156 },
  { dir: 'drawable-land-xhdpi', width: 1280, height: 720, iconSize: 224 },
  { dir: 'drawable-land-xxhdpi', width: 1600, height: 960, iconSize: 280 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280, iconSize: 340 },
];

async function run() {
  if (!fs.existsSync(resDir)) {
    throw new Error('android/app/src/main/res does not exist yet. Run `npx cap add android` first.');
  }

  // Generate launcher icons per density
  for (const d of launcherDensities) {
    const outDir = path.join(resDir, d.name);
    fs.mkdirSync(outDir, { recursive: true });

    await sharp(Buffer.from(iconSvg), { density: 384 })
      .resize(d.legacy, d.legacy)
      .png()
      .toFile(path.join(outDir, 'ic_launcher.png'));

    await sharp(Buffer.from(roundSvg), { density: 384 })
      .resize(d.legacy, d.legacy)
      .png()
      .toFile(path.join(outDir, 'ic_launcher_round.png'));

    await sharp(Buffer.from(foregroundOnlySvg), { density: 384 })
      .resize(d.adaptive, d.adaptive)
      .png()
      .toFile(path.join(outDir, 'ic_launcher_foreground.png'));

    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs><linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#16392c"/><stop offset="100%" stop-color="#102a20"/></linearGradient></defs><rect width="512" height="512" fill="url(#bgGrad)"/></svg>`), { density: 384 })
      .resize(d.adaptive, d.adaptive)
      .png()
      .toFile(path.join(outDir, 'ic_launcher_background.png'));
  }

  // Play Store 512x512 asset
  await sharp(Buffer.from(iconSvg), { density: 384 })
    .resize(512, 512)
    .png()
    .toFile(path.join(rootDir, 'android', 'app', 'src', 'main', 'ic_launcher-playstore.png'));

  // Remove Capacitor's default placeholder vector drawables so our custom MetroNav resources always apply
  const oldFgVector = path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml');
  if (fs.existsSync(oldFgVector)) {
    fs.unlinkSync(oldFgVector);
  }

  // Exact MetroNav forest-green gradient drawable + monochrome Material You vector + status-bar white icon
  const drawableDir = path.join(resDir, 'drawable');
  fs.mkdirSync(drawableDir, { recursive: true });

  fs.writeFileSync(
    path.join(drawableDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:angle="315"
        android:startColor="#16392C"
        android:endColor="#102A20"
        android:type="linear" />
</shape>
`,
    'utf8'
  );

  // Android 13+ Material You monochrome themed launcher icon
  fs.writeFileSync(
    path.join(drawableDir, 'ic_launcher_monochrome.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="512"
    android:viewportHeight="512">
    <group
        android:translateX="148"
        android:translateY="148"
        android:scaleX="9"
        android:scaleY="9">
        <path
            android:pathData="M8,3.1V7a4,4 0,0 0,8 0V3.1"
            android:strokeWidth="1.85"
            android:strokeColor="#FFFFFFFF"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:pathData="m9,15 -1,-1"
            android:strokeWidth="1.85"
            android:strokeColor="#FFFFFFFF"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:pathData="m15,15 1,-1"
            android:strokeWidth="1.85"
            android:strokeColor="#FFFFFFFF"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:pathData="M9,19c-2.8,0 -5,-2.2 -5,-5v-4a8,8 0,0 1,16 0v4c0,2.8 -2.2,5 -5,5Z"
            android:strokeWidth="1.85"
            android:strokeColor="#FFFFFFFF"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:pathData="m8,19 -2,3"
            android:strokeWidth="1.85"
            android:strokeColor="#FFFFFFFF"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:pathData="m16,19 2,3"
            android:strokeWidth="1.85"
            android:strokeColor="#FFFFFFFF"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
    </group>
</vector>
`,
    'utf8'
  );

  // Android Notification Status Bar Small Icon (must be white silhouette on transparent background)
  fs.writeFileSync(
    path.join(drawableDir, 'ic_stat_metronav.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:pathData="M8,3.1V7a4,4 0,0 0,8 0V3.1"
        android:strokeWidth="2"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <path
        android:pathData="m9,15 -1,-1"
        android:strokeWidth="2"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <path
        android:pathData="m15,15 1,-1"
        android:strokeWidth="2"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <path
        android:pathData="M9,19c-2.8,0 -5,-2.2 -5,-5v-4a8,8 0,0 1,16 0v4c0,2.8 -2.2,5 -5,5Z"
        android:strokeWidth="2"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <path
        android:pathData="m8,19 -2,3"
        android:strokeWidth="2"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <path
        android:pathData="m16,19 2,3"
        android:strokeWidth="2"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
</vector>
`,
    'utf8'
  );

  // Adaptive icon definitions (mipmap-anydpi-v26)
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpiDir, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXml, 'utf8');
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml, 'utf8');

  // Matching launcher background & notification accent colors
  const valuesDir = path.join(resDir, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(
    path.join(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#133126</color>
</resources>
`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(valuesDir, 'colors.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="notificationAccent">#5EE9B5</color>
    <color name="splashBackground">#102A20</color>
</resources>
`,
    'utf8'
  );

  // Dark MetroNav splash screens across all orientations/densities
  for (const sp of splashSizes) {
    const outDir = path.join(resDir, sp.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const iconBuf = await sharp(Buffer.from(iconSvg), { density: 384 })
      .resize(sp.iconSize, sp.iconSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: sp.width,
        height: sp.height,
        channels: 4,
        background: { r: 16, g: 42, b: 32, alpha: 1 },
      },
    })
      .composite([{ input: iconBuf, gravity: 'center' }])
      .png()
      .toFile(path.join(outDir, 'splash.png'));
  }

  console.log('[android-icons] Generated all MetroNav launcher icons, adaptive icons, monochrome vector, notification smallIcon, and splash screens.');
}

run().catch((err) => {
  console.error('[android-icons] Failed:', err);
  process.exit(1);
});
