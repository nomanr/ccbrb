import { execSync } from 'node:child_process';
import { getClaudeProcesses, getAncestorPids, resolveSession, getTtyOfProcess, parseExtraArgs } from './process.js';
import { writeManifest } from './manifest.js';

export async function close() {
  const ancestors = getAncestorPids(process.pid);
  const claudeProcesses = getClaudeProcesses()
    .filter(p => !ancestors.has(p.pid));

  if (claudeProcesses.length === 0) {
    console.log('No Claude sessions found.');
    return;
  }

  const sessions = [];
  const pidsToKill = [];

  for (const proc of claudeProcesses) {
    const resolved = resolveSession(proc.pid, proc.command);
    if (!resolved) {
      console.warn(`Warning: Could not resolve session for PID ${proc.pid}, skipping.`);
      continue;
    }

    resolved.tty = getTtyOfProcess(proc.pid);
    resolved.args = parseExtraArgs(proc.command);
    sessions.push(resolved);
    pidsToKill.push(proc.pid);
  }

  if (sessions.length === 0) {
    console.log('No Claude sessions found.');
    return;
  }

  writeManifest(sessions);
  console.log(`Saved ${sessions.length} session(s) to manifest.`);

  for (const pid of pidsToKill) {
    try {
      execSync(`kill -INT ${pid}`, { stdio: 'ignore' });
    } catch {
      // process may have already exited
    }
  }

  console.log(`Closed ${pidsToKill.length} session(s).`);
}
