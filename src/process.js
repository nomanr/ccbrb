import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function parseSessionIdFromArgs(args) {
  const resumeMatch = args.match(/(?:--resume|-r)\s+([a-f0-9-]+)/);
  if (resumeMatch) return resumeMatch[1];

  const sessionIdMatch = args.match(/--session-id\s+([a-f0-9-]+)/);
  if (sessionIdMatch) return sessionIdMatch[1];

  return null;
}

export function encodeCwdToProjectDir(cwd) {
  return cwd.replace(/\//g, '-');
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
      'ps -eo pid,ppid,command | grep -E "[c]laude\\b"',
      { encoding: 'utf-8' }
    ).trim();

    if (!output) return [];

    return output.split('\n').map(line => {
      const trimmed = line.trim();
      const parts = trimmed.split(/\s+/);
      const pid = parseInt(parts[0], 10);
      const ppid = parseInt(parts[1], 10);
      const command = parts.slice(2).join(' ');
      return { pid, ppid, command };
    }).filter(p => !p.command.includes('grep'));
  } catch {
    return [];
  }
}

export function getCwdOfProcess(pid) {
  try {
    const output = execSync(`lsof -d cwd -p ${pid} -Fn 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim();
    const lines = output.split('\n');
    const cwdLine = lines.find(l => l.startsWith('n') && !l.startsWith('n/dev'));
    return cwdLine ? cwdLine.slice(1) : null;
  } catch {
    return null;
  }
}

export function resolveSession(pid, command) {
  const sessionId = parseSessionIdFromArgs(command);
  if (sessionId) {
    const cwd = getCwdOfProcess(pid);
    return { sessionId, cwd };
  }

  const cwd = getCwdOfProcess(pid);
  if (!cwd) return null;

  const projectDir = path.join(
    os.homedir(),
    '.claude',
    'projects',
    encodeCwdToProjectDir(cwd)
  );
  const resolvedId = resolveSessionFromProjectDir(projectDir);
  if (!resolvedId) return null;

  return { sessionId: resolvedId, cwd };
}
