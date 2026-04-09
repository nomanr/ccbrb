import { execFileSync } from 'node:child_process';
import path from 'node:path';
import pc from 'picocolors';
import { select, isCancel } from '@clack/prompts';
import { openTab, writeToTty } from './terminal.js';
import { readManifest } from './manifest.js';
import { isValidSessionId, getClaudeProcesses, parseSessionIdFromArgs } from './process.js';

function getRunningSessionIds() {
  return new Set(
    getClaudeProcesses()
      .map(p => parseSessionIdFromArgs(p.command))
      .filter(Boolean)
  );
}

function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function resumeSession(session) {
  const args = session.args ? ` ${session.args}` : '';
  const cmd = `cd ${shellQuote(session.cwd)} && clear && claude --resume ${session.sessionId}${args}`;

  if (session.tty && writeToTty(session.tty, cmd, session.terminal)) {
    return;
  }

  openTab(cmd);
}

export async function back() {
  const manifest = readManifest();
  if (!manifest || manifest.sessions.length === 0) {
    console.log(pc.yellow('No saved sessions to resume.'));
    return;
  }

  const running = getRunningSessionIds();
  const toResume = manifest.sessions.filter(s => {
    if (!s.cwd || !s.sessionId || !isValidSessionId(s.sessionId)) return false;
    return !running.has(s.sessionId);
  });

  if (toResume.length === 0) {
    console.log(pc.green('All sessions are already running.'));
    return;
  }

  const skipped = manifest.sessions.length - toResume.length;
  if (skipped > 0) {
    console.log(pc.dim(`  ${skipped} session(s) already running, skipping\n`));
  }

  console.log(pc.cyan(`Resuming ${pc.bold(toResume.length)} session(s)...\n`));

  for (const session of toResume) {
    const project = path.basename(session.cwd);
    const title = session.title || 'untitled';
    resumeSession(session);
    console.log(pc.cyan(`  back ${pc.bold(project)} ${pc.dim('·')} ${title}`));
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${pc.green(`Resumed ${pc.bold(toResume.length)} session(s).`)} Welcome back!`);
}

function resumeInline(session) {
  const args = ['--resume', session.sessionId];
  if (session.args) args.push(...session.args.split(/\s+/));

  process.chdir(session.cwd);
  execFileSync('claude', args, { stdio: 'inherit' });
}

export async function backOne() {
  const manifest = readManifest();
  if (!manifest || manifest.sessions.length === 0) {
    console.log(pc.yellow('No saved sessions to resume.'));
    return;
  }

  const valid = manifest.sessions.filter(
    s => s.cwd && s.sessionId && isValidSessionId(s.sessionId)
  );

  if (valid.length === 0) {
    console.log(pc.yellow('No valid sessions to resume.'));
    return;
  }

  let session;
  if (valid.length === 1) {
    session = valid[0];
  } else {
    const picked = await select({
      message: 'Which session?',
      options: valid.map(s => ({
        value: s.sessionId,
        label: pc.bold(path.basename(s.cwd)),
        hint: s.title || 'untitled',
      })),
    });

    if (isCancel(picked)) {
      process.exit(0);
    }

    session = valid.find(s => s.sessionId === picked);
  }

  const project = path.basename(session.cwd);
  const title = session.title || 'untitled';
  console.log(pc.cyan(`  back ${pc.bold(project)} ${pc.dim('·')} ${title}\n`));

  resumeInline(session);
}
