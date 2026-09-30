import path from 'node:path';
import pc from 'picocolors';
import { getClaudeProcesses, getAncestorPids, resolveSession, getTtyOfProcess, parseExtraArgs, getSessionTitle } from './process.js';
import { readManifest, writeManifest } from './manifest.js';
import { terminalName, terminalLayout, windowDesktops } from './terminal.js';

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function stop(pids) {
  for (const pid of pids) {
    try { process.kill(pid, 'SIGINT'); } catch {}
  }
  for (let i = 0; i < 20 && pids.some(isAlive); i++) {
    await new Promise(r => setTimeout(r, 250));
  }
  for (const pid of pids.filter(isAlive)) {
    try { process.kill(pid, 'SIGTERM'); } catch {}
  }
}

export async function brb({ only } = {}) {
  const ancestors = getAncestorPids(process.pid);
  const claudeProcesses = getClaudeProcesses()
    .filter(p => !ancestors.has(p.pid));

  if (claudeProcesses.length === 0) {
    console.log(pc.yellow('No Claude sessions found.'));
    return;
  }

  const terminal = only || terminalName();
  const layout = terminalLayout(terminal);
  const desktops = windowDesktops();
  const previous = new Map((readManifest()?.sessions || []).map(s => [s.sessionId, s]));

  const sessions = [];
  const pidsToKill = [];

  for (const proc of claudeProcesses) {
    const tty = getTtyOfProcess(proc.pid);
    const place = tty ? layout.get(tty) : null;
    if (only && !place) continue;

    const resolved = resolveSession(proc.pid, proc.command);
    if (!resolved) {
      console.warn(pc.yellow(`Warning: Could not resolve session for PID ${proc.pid}, skipping.`));
      continue;
    }
    if (resolved.guessed) {
      console.warn(pc.yellow(`Warning: PID ${proc.pid} has no session file, guessed ${resolved.sessionId}.`));
    }

    const before = place ? null : previous.get(resolved.sessionId);
    sessions.push({
      sessionId: resolved.sessionId,
      cwd: resolved.cwd,
      configDir: resolved.configDir,
      title: getSessionTitle(resolved.sessionId, resolved.cwd, resolved.configDir),
      tty,
      terminal,
      window: place?.windowId || before?.window || null,
      tab: place?.tab ?? before?.tab ?? null,
      desktop: place ? desktops.get(place.windowId) || null : before?.desktop || null,
      args: parseExtraArgs(proc.command),
    });
    pidsToKill.push(proc.pid);
  }

  if (sessions.length === 0) {
    console.log(pc.yellow('No Claude sessions found.'));
    return;
  }

  writeManifest(sessions);

  for (const s of sessions) {
    const project = path.basename(s.cwd);
    const title = s.title || 'untitled';
    console.log(pc.green(`  saved ${pc.bold(project)} ${pc.dim('·')} ${title}`));
  }

  await stop(pidsToKill);

  console.log(`\n${pc.green(`Closed ${pc.bold(pidsToKill.length)} session(s).`)} brb!`);
}
