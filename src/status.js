import os from 'node:os';
import path from 'node:path';
import pc from 'picocolors';
import { readManifest } from './manifest.js';

function shortPath(p) {
  const home = os.homedir();
  return p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

export function status() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const manifest = readManifest();
  if (!manifest || manifest.sessions.length === 0) {
    console.log(pc.yellow('No saved sessions.'));
    return;
  }

  console.log(`\n${pc.dim('Saved at')} ${manifest.timestamp}`);
  console.log(`${pc.dim('Sessions')} ${pc.bold(manifest.sessions.length)}\n`);

  for (const s of manifest.sessions) {
    const project = path.basename(s.cwd);
    const title = s.title ? pc.white(s.title) : pc.dim('untitled');
    console.log(`  ${pc.bold(project)} ${pc.dim('·')} ${title}`);
    console.log(`  ${pc.dim(shortPath(s.cwd))}`);
    if (verbose) console.log(`  ${pc.dim(s.sessionId)}`);
    console.log();
  }
}
