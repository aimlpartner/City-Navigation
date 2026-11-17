import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const appApiDir = path.join(rootDir, 'app', 'api');
const backupApiDir = path.join(rootDir, '.capacitor-api-backup');
const nextDir = path.join(rootDir, '.next');

function moveDirSync(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.rmSync(dest, { recursive: true, force: true });
  try {
    fs.renameSync(src, dest);
  } catch {
    fs.cpSync(src, dest, { recursive: true });
    fs.rmSync(src, { recursive: true, force: true });
  }
  return true;
}

// Recover if a previous interrupted run left .capacitor-api-backup around
if (!fs.existsSync(appApiDir) && fs.existsSync(backupApiDir)) {
  moveDirSync(backupApiDir, appApiDir);
}

const movedApi = moveDirSync(appApiDir, backupApiDir);

try {
  // Clean stale .next so static export never inherits server manifests
  fs.rmSync(nextDir, { recursive: true, force: true });

  console.log('[capacitor-build] Building static Next.js export into out/ ...');
  execSync('npx next build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      CAPACITOR_BUILD: 'true',
    },
  });

  const outIndex = path.join(rootDir, 'out', 'index.html');
  if (!fs.existsSync(outIndex)) {
    throw new Error('Static export completed but out/index.html was not generated.');
  }
  console.log('[capacitor-build] Static export verified at out/index.html');
} finally {
  if (movedApi || fs.existsSync(backupApiDir)) {
    moveDirSync(backupApiDir, appApiDir);
    console.log('[capacitor-build] Restored app/api routes.');
  }
}
