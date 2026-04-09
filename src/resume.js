import { openTab, isIterm2Running } from './iterm2.js';
import { readManifest } from './manifest.js';

export async function resume() {
  if (!isIterm2Running()) {
    console.error('iTerm2 is not running. Please open iTerm2 first.');
    process.exit(1);
  }

  const manifest = readManifest();
  if (!manifest || manifest.sessions.length === 0) {
    console.log('No saved sessions to resume.');
    return;
  }

  console.log(`Resuming ${manifest.sessions.length} session(s) from ${manifest.timestamp}...`);

  for (const session of manifest.sessions) {
    const cmd = `cd ${JSON.stringify(session.cwd)} && claude --resume ${session.sessionId}`;
    openTab(cmd);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`Resumed ${manifest.sessions.length} session(s).`);
}
