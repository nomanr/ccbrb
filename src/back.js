import path from 'node:path';
import pc from 'picocolors';
import { openTab, writeToTty } from './terminal.js';
import { readManifest } from './manifest.js';
import { isValidSessionId } from './process.js';

function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export async function back() {
  const manifest = readManifest();
  if (!manifest || manifest.sessions.length === 0) {
    console.log(pc.yellow('No saved sessions to resume.'));
    return;
  }

  console.log(pc.cyan(`Resuming ${pc.bold(manifest.sessions.length)} session(s)...\n`));

  let resumed = 0;
  for (const session of manifest.sessions) {
    const project = path.basename(session.cwd || '');
    const title = session.title || 'untitled';

    if (!session.cwd || !session.sessionId) {
      console.warn(pc.yellow(`  skip ${project} ${pc.dim('·')} missing cwd or sessionId`));
      continue;
    }

    if (!isValidSessionId(session.sessionId)) {
      console.warn(pc.yellow(`  skip ${project} ${pc.dim('·')} invalid sessionId`));
      continue;
    }

    const args = session.args ? ` ${session.args}` : '';
    const cmd = `cd ${shellQuote(session.cwd)} && clear && claude --resume ${session.sessionId}${args}`;

    if (session.tty && writeToTty(session.tty, cmd, session.terminal)) {
      console.log(pc.cyan(`  back ${pc.bold(project)} ${pc.dim('·')} ${title}`));
      resumed++;
      continue;
    }

    openTab(cmd);
    console.log(pc.cyan(`  back ${pc.bold(project)} ${pc.dim('·')} ${title}`));
    resumed++;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${pc.green(`Resumed ${pc.bold(resumed)} session(s).`)} Welcome back!`);
}
