import { execSync } from 'node:child_process';
import path from 'node:path';
import pc from 'picocolors';
import { getClaudeProcesses, getAncestorPids, resolveSession, getTtyOfProcess, parseExtraArgs, getSessionTitle } from './process.js';
import { writeManifest } from './manifest.js';
import { terminalName } from './terminal.js';

export async function brb() {
  const ancestors = getAncestorPids(process.pid);
  const claudeProcesses = getClaudeProcesses()
    .filter(p => !ancestors.has(p.pid));

  if (claudeProcesses.length === 0) {
    console.log(pc.yellow('No Claude sessions found.'));
    return;
  }

  const sessions = [];
  const pidsToKill = [];

  for (const proc of claudeProcesses) {
    const resolved = resolveSession(proc.pid, proc.command);
    if (!resolved) {
      console.warn(pc.yellow(`Warning: Could not resolve session for PID ${proc.pid}, skipping.`));
      continue;
    }

    resolved.title = getSessionTitle(resolved.sessionId, resolved.cwd);
    resolved.tty = getTtyOfProcess(proc.pid);
    resolved.terminal = terminalName();
    resolved.args = parseExtraArgs(proc.command);
    sessions.push(resolved);
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

  for (const pid of pidsToKill) {
    try {
      execSync(`kill -INT ${pid}`, { stdio: 'ignore' });
    } catch {
      // process may have already exited
    }
  }

  console.log(`\n${pc.green(`Closed ${pc.bold(pidsToKill.length)} session(s).`)} brb!`);
}
