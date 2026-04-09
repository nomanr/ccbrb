import { listTabPids, getTtyPid, sendCtrlC, closeTabByTty, isIterm2Running } from './iterm2.js';
import { resolveSession } from './process.js';
import { writeManifest } from './manifest.js';

function findClaudeInTty(ttyProcesses) {
  const lines = ttyProcesses.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/\bclaude\b/) && !trimmed.includes('grep')) {
      const parts = trimmed.split(/\s+/);
      const pid = parseInt(parts[0], 10);
      const command = parts.slice(1).join(' ');
      return { pid, command };
    }
  }
  return null;
}

export async function close() {
  if (!isIterm2Running()) {
    console.log('iTerm2 is not running.');
    return;
  }

  const tabs = listTabPids();
  if (tabs.length === 0) {
    console.log('No iTerm2 tabs found.');
    return;
  }

  const sessions = [];
  const tabsToClose = [];

  for (const tab of tabs) {
    const ttyProcesses = getTtyPid(tab.tty);
    const claudeProcess = findClaudeInTty(ttyProcesses);
    if (!claudeProcess) continue;

    const resolved = resolveSession(claudeProcess.pid, claudeProcess.command);
    if (!resolved) {
      console.warn(`Warning: Could not resolve session for PID ${claudeProcess.pid}, skipping.`);
      continue;
    }

    sessions.push(resolved);
    tabsToClose.push(tab.tty);
  }

  if (sessions.length === 0) {
    console.log('No Claude sessions found.');
    return;
  }

  writeManifest(sessions);
  console.log(`Saved ${sessions.length} session(s) to manifest.`);

  for (const tty of tabsToClose) {
    sendCtrlC(tty);
  }

  await new Promise(r => setTimeout(r, 2000));

  for (const tty of tabsToClose) {
    closeTabByTty(tty);
  }

  console.log(`Closed ${tabsToClose.length} tab(s).`);
}
