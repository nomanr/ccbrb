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
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

export function writeManifest(sessions) {
  const manifestPath = getManifestPath();
  const manifest = {
    timestamp: new Date().toISOString(),
    sessions,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
