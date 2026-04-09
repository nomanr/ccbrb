import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSessionIdFromArgs, encodeCwdToProjectDir, resolveSessionFromProjectDir } from '../src/process.js';

describe('parseSessionIdFromArgs', () => {
  it('extracts session ID from --resume flag', () => {
    const args = 'claude --resume abc-123-def';
    assert.equal(parseSessionIdFromArgs(args), 'abc-123-def');
  });

  it('extracts session ID from -r flag', () => {
    const args = 'claude -r abc-123-def';
    assert.equal(parseSessionIdFromArgs(args), 'abc-123-def');
  });

  it('extracts session ID from --session-id flag', () => {
    const args = 'claude --session-id abc-123-def';
    assert.equal(parseSessionIdFromArgs(args), 'abc-123-def');
  });

  it('returns null when no session flag present', () => {
    const args = 'claude --help';
    assert.equal(parseSessionIdFromArgs(args), null);
  });
});

describe('encodeCwdToProjectDir', () => {
  it('encodes path to Claude project directory format', () => {
    const cwd = '/Users/nomanr/Documents/Workspace/sideprojects';
    const result = encodeCwdToProjectDir(cwd);
    assert.equal(result, '-Users-nomanr-Documents-Workspace-sideprojects');
  });

  it('handles root path', () => {
    assert.equal(encodeCwdToProjectDir('/'), '-');
  });
});

describe('resolveSessionFromProjectDir', () => {
  it('returns the most recent session ID from a project dir', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-proj-'));

    const oldFile = path.join(tmpDir, 'old-session-id.jsonl');
    const newFile = path.join(tmpDir, 'new-session-id.jsonl');
    fs.writeFileSync(oldFile, '{"type":"permission-mode"}\n');

    await new Promise(r => setTimeout(r, 50));
    fs.writeFileSync(newFile, '{"type":"permission-mode"}\n');

    const result = resolveSessionFromProjectDir(tmpDir);
    assert.equal(result, 'new-session-id');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null for empty directory', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-proj-'));
    const result = resolveSessionFromProjectDir(tmpDir);
    assert.equal(result, null);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
