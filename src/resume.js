import { openTab, writeToTty } from './terminal.js';
import { readManifest } from './manifest.js';
import { isValidSessionId } from './process.js';

function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export async function resume() {
  const manifest = readManifest();
  if (!manifest || manifest.sessions.length === 0) {
    console.log('No saved sessions to resume.');
    return;
  }

  console.log(`Resuming ${manifest.sessions.length} session(s) from ${manifest.timestamp}...`);

  let resumed = 0;
  for (const session of manifest.sessions) {
    if (!session.cwd || !session.sessionId) {
      console.warn(`Warning: Skipping session with missing cwd or sessionId.`);
      continue;
    }

    if (!isValidSessionId(session.sessionId)) {
      console.warn(`Warning: Skipping session with invalid sessionId: ${session.sessionId}`);
      continue;
    }

    const args = session.args ? ` ${session.args}` : '';
    const cmd = `cd ${shellQuote(session.cwd)} && clear && claude --resume ${session.sessionId}${args}`;

    if (session.tty && writeToTty(session.tty, cmd)) {
      resumed++;
      continue;
    }

    openTab(cmd);
    resumed++;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`Resumed ${resumed} session(s).`);
}
