import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SESSION_ID_RE = /[a-f0-9A-F]{8}-[a-f0-9A-F]{4}-[a-f0-9A-F]{4}-[a-f0-9A-F]{4}-[a-f0-9A-F]{12}/;

export function parseSessionIdFromArgs(args) {
  const resumeMatch = args.match(new RegExp(`(?:--resume|-r)\\s+(${SESSION_ID_RE.source})`));
  if (resumeMatch) return resumeMatch[1];

  const sessionIdMatch = args.match(new RegExp(`--session-id\\s+(${SESSION_ID_RE.source})`));
  if (sessionIdMatch) return sessionIdMatch[1];

  return null;
}

export function parseExtraArgs(command) {
  const claudeIndex = command.lastIndexOf('claude');
  if (claudeIndex === -1) return null;

  const afterClaude = command.slice(claudeIndex);
  const argsOnly = afterClaude.replace(/^claude\S*/, '').trim();

  const stripped = argsOnly
    .replace(new RegExp(`(?:--resume|-r)\\s+${SESSION_ID_RE.source}`, 'g'), '')
    .replace(new RegExp(`--session-id\\s+${SESSION_ID_RE.source}`, 'g'), '')
    .trim();
  return stripped || null;
}

export function isValidSessionId(id) {
  return typeof id === 'string' && SESSION_ID_RE.test(id);
}

export function defaultConfigDir() {
  return path.join(os.homedir(), '.claude');
}

export function listConfigDirs(home = os.homedir()) {
  const dirs = [path.join(home, '.claude')];
  try {
    for (const name of fs.readdirSync(home)) {
      if (!name.startsWith('.claude-')) continue;
      const full = path.join(home, name);
      if (fs.existsSync(path.join(full, 'sessions'))) dirs.push(full);
    }
  } catch {
    return dirs;
  }
  return dirs;
}

export function readSessionFile(pid, configDirs = listConfigDirs()) {
  for (const configDir of configDirs) {
    const file = path.join(configDir, 'sessions', `${pid}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (!isValidSessionId(data.sessionId)) continue;
      return { sessionId: data.sessionId, cwd: data.cwd || null, configDir, status: data.status || null };
    } catch {
      continue;
    }
  }
  return null;
}

export function encodeCwdToProjectDir(cwd) {
  return cwd.replace(/[/_]/g, '-');
}

export function resolveSessionFromProjectDir(projectDir) {
  if (!fs.existsSync(projectDir)) return null;

  const jsonlFiles = fs.readdirSync(projectDir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(projectDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (jsonlFiles.length === 0) return null;
  return jsonlFiles[0].name.replace('.jsonl', '');
}

export function getClaudeProcesses() {
  try {
    const output = execSync(
      'ps -eo pid,ppid,command',
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    if (!output) return [];

    return output.split('\n').slice(1)
      .map(line => {
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        const pid = parseInt(parts[0], 10);
        const ppid = parseInt(parts[1], 10);
        const command = parts.slice(2).join(' ');
        return { pid, ppid, command };
      })
      .filter(p => {
        const cmd = p.command;
        return /(?:^|\/)claude(?:\s|$)/.test(cmd) && !cmd.includes('ccbrb');
      });
  } catch {
    return [];
  }
}

export function getAncestorPids(pid) {
  const ancestors = new Set();
  let current = pid;
  while (current > 1) {
    ancestors.add(current);
    try {
      const ppid = parseInt(
        execSync(`ps -o ppid= -p ${current}`, { encoding: 'utf-8' }).trim(), 10
      );
      if (isNaN(ppid) || ancestors.has(ppid)) break;
      current = ppid;
    } catch { break; }
  }
  return ancestors;
}

export function getTtyOfProcess(pid) {
  try {
    const output = execSync(`ps -o tty= -p ${pid}`, {
      encoding: 'utf-8',
    }).trim();
    if (!output || output === '??') return null;
    return '/dev/' + output;
  } catch {
    return null;
  }
}

export function getCwdOfProcess(pid) {
  try {
    const output = execSync(`lsof -a -d cwd -p ${pid} -Fn 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim();
    const lines = output.split('\n');
    const cwdLine = lines.find(l => l.startsWith('n') && !l.startsWith('n/dev'));
    return cwdLine ? cwdLine.slice(1) : null;
  } catch {
    return null;
  }
}

export function getSessionTitle(sessionId, cwd, configDir = defaultConfigDir()) {
  if (!sessionId || !cwd) return null;

  const projectDir = path.join(
    configDir,
    'projects',
    encodeCwdToProjectDir(cwd)
  );
  const jsonlPath = path.join(projectDir, `${sessionId}.jsonl`);

  if (!fs.existsSync(jsonlPath)) return null;

  try {
    const content = fs.readFileSync(jsonlPath, 'utf-8');
    let firstUserMessage = null;
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line);
      if (entry.type === 'custom-title' && entry.customTitle) {
        return entry.customTitle;
      }
      if (!firstUserMessage && entry.type === 'user' && entry.message?.content) {
        const text = typeof entry.message.content === 'string'
          ? entry.message.content
          : entry.message.content.find(b => b.type === 'text')?.text;
        if (text) firstUserMessage = text;
      }
    }
    if (firstUserMessage) {
      const trimmed = firstUserMessage.trim().split('\n')[0];
      return trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed;
    }
  } catch {
    // corrupted or unreadable
  }
  return null;
}

export function resolveSession(pid, command, configDirs = listConfigDirs()) {
  const fromFile = readSessionFile(pid, configDirs);
  if (fromFile) {
    const cwd = fromFile.cwd || getCwdOfProcess(pid);
    if (!cwd) return null;
    return { sessionId: fromFile.sessionId, cwd, configDir: fromFile.configDir, status: fromFile.status };
  }

  const sessionId = parseSessionIdFromArgs(command);
  const cwd = getCwdOfProcess(pid);
  if (!cwd) return null;

  if (sessionId) {
    return { sessionId, cwd, configDir: defaultConfigDir(), status: null };
  }

  const projectDir = path.join(defaultConfigDir(), 'projects', encodeCwdToProjectDir(cwd));
  const resolvedId = resolveSessionFromProjectDir(projectDir);
  if (!resolvedId) return null;

  return { sessionId: resolvedId, cwd, configDir: defaultConfigDir(), status: null, guessed: true };
}

export function getRunningSessionIds(configDirs = listConfigDirs()) {
  const ids = new Set();
  for (const proc of getClaudeProcesses()) {
    const fromFile = readSessionFile(proc.pid, configDirs);
    const id = fromFile?.sessionId || parseSessionIdFromArgs(proc.command);
    if (id) ids.add(id);
  }
  return ids;
}
