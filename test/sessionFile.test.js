import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSessionFile, listConfigDirs } from '../src/process.js';

const ID = '61a8edd3-eba8-4bc3-883c-6144fc486b70';

function tempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccbrb-'));
  fs.mkdirSync(path.join(home, '.claude', 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(home, '.claude-b', 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(home, '.claude-empty'), { recursive: true });
  return home;
}

describe('listConfigDirs', () => {
  it('returns the default dir and every .claude-* dir that holds sessions', () => {
    const home = tempHome();
    assert.deepEqual(listConfigDirs(home).map(d => path.basename(d)).sort(), ['.claude', '.claude-b']);
  });
});

describe('readSessionFile', () => {
  it('reads the session id and the account dir from the pid file', () => {
    const home = tempHome();
    const dir = path.join(home, '.claude-b');
    fs.writeFileSync(path.join(dir, 'sessions', '4242.json'), JSON.stringify({ pid: 4242, sessionId: ID, cwd: '/work', status: 'idle' }));
    assert.deepEqual(readSessionFile(4242, listConfigDirs(home)), { sessionId: ID, cwd: '/work', configDir: dir, status: 'idle' });
  });

  it('returns null when no account has a file for the pid', () => {
    assert.equal(readSessionFile(4242, listConfigDirs(tempHome())), null);
  });

  it('skips a file whose session id is not a uuid', () => {
    const home = tempHome();
    fs.writeFileSync(path.join(home, '.claude', 'sessions', '7.json'), JSON.stringify({ sessionId: 'nope' }));
    assert.equal(readSessionFile(7, listConfigDirs(home)), null);
  });
});
