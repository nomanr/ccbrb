import path from 'node:path';
import pc from 'picocolors';
import { readManifest } from './manifest.js';

export function status() {
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
    console.log(`  ${pc.dim(s.sessionId)}`);
    console.log(`  ${pc.dim(s.cwd)}\n`);
  }
}
