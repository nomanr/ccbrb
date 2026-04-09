import path from 'node:path';
import { readManifest } from './manifest.js';

export function status() {
  const manifest = readManifest();
  if (!manifest || manifest.sessions.length === 0) {
    console.log('No saved sessions.');
    return;
  }

  console.log(`Saved at: ${manifest.timestamp}`);
  console.log(`Sessions: ${manifest.sessions.length}\n`);

  const idWidth = 12;
  const header = `${'SESSION ID'.padEnd(idWidth)}  PROJECT`;
  console.log(header);
  console.log('-'.repeat(header.length + 20));

  for (const s of manifest.sessions) {
    const shortId = s.sessionId.slice(0, 8) + '...';
    const project = path.basename(s.cwd);
    console.log(`${shortId.padEnd(idWidth)}  ${project} (${s.cwd})`);
  }
}
