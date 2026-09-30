import { execFileSync } from 'node:child_process';
import path from 'node:path';
import pc from 'picocolors';
import { select, isCancel } from '@clack/prompts';
import { openTab, writeToTty, supportsWindows, openWindowIn, openTabIn, switchDesktop } from './terminal.js';
import { readManifest } from './manifest.js';
import { isValidSessionId, getRunningSessionIds, defaultConfigDir } from './process.js';

function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

const CLEAR_CLAUDE_ENV = `for v in $(env | sed -n 's/^\\(CLAUDE[A-Za-z0-9_]*\\)=.*/\\1/p'); do unset "$v"; done; `;

function claudeCommand(session) {
  const args = session.args ? ` ${session.args}` : '';
  const env = session.configDir && session.configDir !== defaultConfigDir()
    ? `CLAUDE_CONFIG_DIR=${shellQuote(session.configDir)} `
    : '';
  return `${CLEAR_CLAUDE_ENV}${env}claude --resume ${session.sessionId}${args}`;
}

function resumeSession(session) {
  const cmd = `cd ${shellQuote(session.cwd)} && clear && ${claudeCommand(session)}`;

  if (session.tty && writeToTty(session.tty, cmd, session.terminal)) {
    return;
  }

  openTab(cmd);
}

function groupByWindow(sessions) {
  const groups = new Map();
  for (const s of sessions) {
    const key = s.window || `solo-${s.sessionId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  for (const list of groups.values()) list.sort((a, b) => (a.tab ?? 0) - (b.tab ?? 0));
  return [...groups.values()];
}

async function resumeInto(terminal, sessions) {
  for (const group of groupByWindow(sessions)) {
    if (group[0].desktop) {
      switchDesktop(group[0].desktop);
      await new Promise(r => setTimeout(r, 700));
    }
    let windowId = null;
    for (const session of group) {
      const cmd = `clear && ${claudeCommand(session)}`;
      windowId = windowId
        ? openTabIn(terminal, cmd, session.cwd, windowId)
        : openWindowIn(terminal, cmd, session.cwd);
      console.log(pc.cyan(`  back ${pc.bold(path.basename(session.cwd))} ${pc.dim('·')} ${session.title || 'untitled'}`));
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export async function back({ terminal } = {}) {
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

  if (terminal && supportsWindows(terminal)) {
    await resumeInto(terminal, toResume);
    console.log(`\n${pc.green(`Resumed ${pc.bold(toResume.length)} session(s) in ${terminal}.`)} Welcome back!`);
    return;
  }

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
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('CLAUDE')));
  if (session.configDir && session.configDir !== defaultConfigDir()) env.CLAUDE_CONFIG_DIR = session.configDir;
  execFileSync('claude', args, { stdio: 'inherit', env });
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
