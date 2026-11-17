import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const localSdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
    : path.join(process.env.HOME || '', 'Android', 'Sdk'));

if (!localSdk || !fs.existsSync(localSdk)) {
  throw new Error(`Android SDK directory not found at "${localSdk}". Set ANDROID_HOME first.`);
}

// 1. Build static web bundle into out/
execSync('node scripts/build-capacitor.mjs', {
  cwd: rootDir,
  stdio: 'inherit',
});

// 2. Ensure Android platform & sync web assets + plugins
if (!fs.existsSync(androidDir)) {
  execSync('npx cap add android', { cwd: rootDir, stdio: 'inherit' });
} else {
  execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });
}

// 3. Re-generate/enforce MetroNav Android launcher & notification icons
execSync('node scripts/generate-android-icons.mjs', {
  cwd: rootDir,
  stdio: 'inherit',
});

// 4. Write local.properties for Gradle with escaped Windows path
const escapedSdk = localSdk.replace(/\\/g, '\\\\');
fs.writeFileSync(path.join(androidDir, 'local.properties'), `sdk.dir=${escapedSdk}\n`, 'utf8');

// 5. Build debug APK using Gradle wrapper
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
console.log('[android-apk] Building debug APK via Gradle...');
execSync(`${gradlew} assembleDebug`, {
  cwd: androidDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    ANDROID_HOME: localSdk,
    ANDROID_SDK_ROOT: localSdk,
  },
});

const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(apkPath)) {
  throw new Error(`Expected debug APK not found at ${apkPath}`);
}
const sizeMb = (fs.statSync(apkPath).size / (1024 * 1024)).toFixed(2);
console.log(`[android-apk] SUCCESS: Built debug APK (${sizeMb} MB) at:\n  ${apkPath}`);
