#!/usr/bin/env node

import { select, intro, isCancel } from '@clack/prompts';
import pc from 'picocolors';

const command = process.argv[2];
const subcommand = process.argv[3];

if (command === '--help' || command === '-h') {
  console.log(`Usage: ${pc.bold('ccbrb')} ${pc.dim('[command]')}

Commands:
  ${pc.green('brb')}        Save all open Claude sessions and close them
  ${pc.cyan('back')}       Reopen all saved sessions
  ${pc.cyan('back one')}   Pick a session to reopen
  ${pc.yellow('status')}     Show saved sessions`);
  process.exit(0);
}

async function prompt() {
  intro(pc.bold('ccbrb') + ' ' + pc.dim('-- Claude Code, be right back'));

  const cmd = await select({
    message: 'What do you want to do?',
    options: [
      { value: 'brb',      label: pc.green('brb'),      hint: 'Save & close all sessions' },
      { value: 'back',     label: pc.cyan('back'),      hint: 'Reopen all saved sessions' },
      { value: 'back-one', label: pc.cyan('back one'),  hint: 'Pick a session to reopen' },
      { value: 'status',   label: pc.yellow('status'),  hint: 'Show saved sessions' },
    ],
  });

  if (isCancel(cmd)) {
    process.exit(0);
  }

  return cmd;
}

try {
  let cmd = command || await prompt();
  if (cmd === 'back' && subcommand === 'one') cmd = 'back-one';

  if (cmd === 'brb') {
    const { brb } = await import('../src/brb.js');
    await brb();
  } else if (cmd === 'back') {
    const { back } = await import('../src/back.js');
    await back();
  } else if (cmd === 'back-one') {
    const { backOne } = await import('../src/back.js');
    await backOne();
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
