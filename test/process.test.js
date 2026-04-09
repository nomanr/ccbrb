import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSessionIdFromArgs, parseExtraArgs, isValidSessionId, encodeCwdToProjectDir, resolveSessionFromProjectDir } from '../src/process.js';

const VALID_UUID = '61a8edd3-eba8-4bc3-883c-6144fc486b70';

describe('parseSessionIdFromArgs', () => {
  it('extracts session ID from --resume flag', () => {
    assert.equal(parseSessionIdFromArgs(`claude --resume ${VALID_UUID}`), VALID_UUID);
  });

  it('extracts session ID from -r flag', () => {
    assert.equal(parseSessionIdFromArgs(`claude -r ${VALID_UUID}`), VALID_UUID);
  });

  it('extracts session ID from --session-id flag', () => {
    assert.equal(parseSessionIdFromArgs(`claude --session-id ${VALID_UUID}`), VALID_UUID);
  });

  it('returns null when no session flag present', () => {
    assert.equal(parseSessionIdFromArgs('claude --help'), null);
  });

  it('returns null for non-uuid values', () => {
    assert.equal(parseSessionIdFromArgs('claude --resume abc-123'), null);
  });

  it('handles uppercase hex', () => {
    const upper = '61A8EDD3-EBA8-4BC3-883C-6144FC486B70';
    assert.equal(parseSessionIdFromArgs(`claude --resume ${upper}`), upper);
  });
});

describe('parseExtraArgs', () => {
  it('extracts flags after claude binary', () => {
    assert.equal(parseExtraArgs('claude --dangerously-skip-permissions'), '--dangerously-skip-permissions');
  });

  it('strips resume flag and keeps other args', () => {
    assert.equal(
      parseExtraArgs(`claude --resume ${VALID_UUID} --dangerously-skip-permissions`),
      '--dangerously-skip-permissions'
    );
  });

  it('handles full binary path without breaking', () => {
    assert.equal(parseExtraArgs('/usr/local/bin/claude --model opus'), '--model opus');
  });

  it('handles path with claude in directory name', () => {
    assert.equal(parseExtraArgs('/opt/claude-tools/bin/claude --model opus'), '--model opus');
  });

  it('returns null for bare claude', () => {
    assert.equal(parseExtraArgs('claude'), null);
  });

  it('returns null when only resume flag present', () => {
    assert.equal(parseExtraArgs(`claude --resume ${VALID_UUID}`), null);
  });
});

describe('isValidSessionId', () => {
  it('accepts valid uuid', () => {
    assert.equal(isValidSessionId(VALID_UUID), true);
  });

  it('rejects short strings', () => {
    assert.equal(isValidSessionId('abc-123'), false);
  });

  it('rejects non-strings', () => {
    assert.equal(isValidSessionId(null), false);
    assert.equal(isValidSessionId(undefined), false);
  });

  it('rejects shell injection attempts', () => {
    assert.equal(isValidSessionId('foo; rm -rf /'), false);
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

  it('replaces underscores with dashes', () => {
    const cwd = '/Users/nomanr/Documents/Workspace/workspace-android/green_android';
    const result = encodeCwdToProjectDir(cwd);
    assert.equal(result, '-Users-nomanr-Documents-Workspace-workspace-android-green-android');
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
