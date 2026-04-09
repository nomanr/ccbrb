#!/usr/bin/env node

const command = process.argv[2];

if (!command || command === '--help' || command === '-h') {
  console.log(`Usage: claude-sessions <command>

Commands:
  close    Save all open Claude sessions and stop them
  resume   Reopen all sessions from the last saved manifest
  status   Show what's currently in the manifest`);
  process.exit(0);
}

try {
  if (command === 'close') {
    const { close } = await import('../src/close.js');
    await close();
  } else if (command === 'resume') {
    const { resume } = await import('../src/resume.js');
    await resume();
  } else if (command === 'status') {
    const { status } = await import('../src/status.js');
    await status();
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
