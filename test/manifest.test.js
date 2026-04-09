import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readManifest, writeManifest } from '../src/manifest.js';

describe('manifest', () => {
  let tmpDir;
  let originalHome;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-sessions-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no manifest exists', () => {
    const result = readManifest();
    assert.equal(result, null);
  });

  it('writes and reads a manifest', () => {
    const sessions = [
      { sessionId: 'abc-123', cwd: '/Users/test/project-a' },
      { sessionId: 'def-456', cwd: '/Users/test/project-b' },
    ];
    writeManifest(sessions);

    const result = readManifest();
    assert.equal(result.sessions.length, 2);
    assert.equal(result.sessions[0].sessionId, 'abc-123');
    assert.equal(result.sessions[1].cwd, '/Users/test/project-b');
    assert.ok(result.timestamp);
  });

  it('overwrites existing manifest', () => {
    writeManifest([{ sessionId: 'old', cwd: '/old' }]);
    writeManifest([{ sessionId: 'new', cwd: '/new' }]);

    const result = readManifest();
    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0].sessionId, 'new');
  });
});
