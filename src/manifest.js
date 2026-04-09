import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function getManifestPath() {
  return path.join(os.homedir(), '.claude', 'session-manifest.json');
}

export function readManifest() {
  const manifestPath = getManifestPath();
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeManifest(sessions) {
  const manifestPath = getManifestPath();
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifest = {
    timestamp: new Date().toISOString(),
    sessions,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
