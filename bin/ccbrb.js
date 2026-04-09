#!/usr/bin/env node

import { select, intro, isCancel } from '@clack/prompts';
import pc from 'picocolors';

const command = process.argv[2];

if (command === '--help' || command === '-h') {
  console.log(`Usage: ${pc.bold('ccbrb')} ${pc.dim('[command]')}

Commands:
  ${pc.green('brb')}      Save all open Claude sessions and close them
  ${pc.cyan('back')}     Reopen all sessions from the last saved manifest
  ${pc.yellow('status')}   Show what's currently in the manifest`);
  process.exit(0);
}

async function prompt() {
  intro(pc.bold('ccbrb') + ' ' + pc.dim('— Claude Code, be right back'));

  const cmd = await select({
    message: 'What do you want to do?',
    options: [
      { value: 'brb',    label: pc.green('brb'),    hint: 'Save & close all sessions' },
      { value: 'back',   label: pc.cyan('back'),   hint: 'Reopen saved sessions' },
      { value: 'status', label: pc.yellow('status'), hint: 'Show saved sessions' },
    ],
  });

  if (isCancel(cmd)) {
    process.exit(0);
  }

  return cmd;
}

try {
  const cmd = command || await prompt();

  if (cmd === 'brb') {
    const { brb } = await import('../src/brb.js');
    await brb();
  } else if (cmd === 'back') {
    const { back } = await import('../src/back.js');
    await back();
  } else if (cmd === 'status') {
    const { status } = await import('../src/status.js');
    await status();
  } else {
    console.error(pc.red(`Unknown command: ${cmd}`));
    process.exit(1);
  }
} catch (err) {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
}
