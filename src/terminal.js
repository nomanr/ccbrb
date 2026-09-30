import { execSync } from 'node:child_process';
import fs from 'node:fs';

function detect() {
  if (process.env.TMUX) return 'tmux';
  const tp = process.env.TERM_PROGRAM || '';
  if (tp === 'iTerm.app') return 'iterm2';
  if (tp === 'Apple_Terminal') return 'apple-terminal';
  if (tp === 'WezTerm') return 'wezterm';
  if (tp === 'ghostty') return 'ghostty';
  if (tp === 'vscode') return 'vscode';
  if ((process.env.TERM || '').includes('kitty')) return 'kitty';
  if (process.env.KONSOLE_VERSION) return 'konsole';
  if (process.env.GNOME_TERMINAL_SCREEN) return 'gnome-terminal';
  if (process.env.WT_SESSION) return 'windows-terminal';
  return null;
}

function osascript(script) {
  return execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
    encoding: 'utf-8',
    timeout: 10000,
  }).trim();
}

function asString(s) {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function ghosttyConfig(cmd, cwd) {
  const lines = ['set cfg to new surface configuration'];
  if (cwd) lines.push(`set initial working directory of cfg to ${asString(cwd)}`);
  lines.push(`set initial input of cfg to ${asString(cmd)} & linefeed`);
  return lines.join('\n');
}

function cleanEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('CLAUDE')));
}

function ensureGhostty() {
  try {
    execSync('pgrep -x ghostty', { stdio: 'ignore' });
  } catch {
    execSync('open -a Ghostty', { env: cleanEnv(), stdio: 'ignore' });
    execSync('sleep 2');
  }
}

const adapters = {
  'ghostty': {
    openWindow(cmd, cwd) {
      ensureGhostty();
      return osascript(`
tell application "Ghostty"
  ${ghosttyConfig(cmd, cwd)}
  set w to new window with configuration cfg
  return id of w
end tell`);
    },
    openTab(cmd, cwd, windowId) {
      if (!windowId) return this.openWindow(cmd, cwd);
      osascript(`
tell application "Ghostty"
  ${ghosttyConfig(cmd, cwd)}
  new tab in (first window whose id is ${asString(windowId)}) with configuration cfg
end tell`);
      return windowId;
    },
    writeToTty() {
      return false;
    },
  },

  'iterm2': {
    layout() {
      const raw = osascript(`
set out to ""
tell application "iTerm2"
  repeat with w in windows
    set tabIndex to 0
    repeat with t in tabs of w
      set tabIndex to tabIndex + 1
      repeat with s in sessions of t
        set out to out & (id of w) & "\t" & tabIndex & "\t" & (tty of s) & linefeed
      end repeat
    end repeat
  end repeat
end tell
return out`);
      const map = new Map();
      for (const line of raw.split('\n')) {
        const [windowId, tab, tty] = line.split('\t');
        if (tty) map.set(tty.trim(), { windowId: windowId.trim(), tab: Number(tab) });
      }
      return map;
    },
    openTab(cmd) {
      const escaped = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      osascript(`
tell application "iTerm2"
  tell current window
    create tab with default profile
    tell current session
      write text "${escaped}"
    end tell
  end tell
end tell`);
    },
    writeToTty(tty, cmd) {
      const escaped = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const result = osascript(`
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is "${tty}" then
          tell s to write text "${escaped}"
          return "found"
        end if
      end repeat
    end repeat
  end repeat
  return "not_found"
end tell`);
      return result === 'found';
    },
  },

  'apple-terminal': {
    openTab(cmd) {
      const escaped = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      osascript(`
tell application "Terminal"
  activate
  do script "${escaped}"
end tell`);
    },
    writeToTty(tty, cmd) {
      const escaped = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      try {
        const result = osascript(`
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is "${tty}" then
        do script "${escaped}" in t
        return "found"
      end if
    end repeat
  end repeat
  return "not_found"
end tell`);
        return result === 'found';
      } catch {
        return false;
      }
    },
  },

  'tmux': {
    openTab(cmd) {
      execSync(`tmux new-window ${quote(cmd)}`, { stdio: 'ignore' });
    },
    writeToTty(tty, cmd) {
      return writeTtyDirect(tty, cmd);
    },
  },

  'kitty': {
    openTab(cmd) {
      execSync(`kitty @ launch --type=tab --cwd=current -- sh -c ${quote(cmd)}`, { stdio: 'ignore' });
    },
    writeToTty(tty, cmd) {
      return writeTtyDirect(tty, cmd);
    },
  },

  'wezterm': {
    openTab(cmd) {
      execSync(`wezterm cli spawn -- sh -c ${quote(cmd)}`, { stdio: 'ignore' });
    },
    writeToTty(tty, cmd) {
      return writeTtyDirect(tty, cmd);
    },
  },

  'gnome-terminal': {
    openTab(cmd) {
      execSync(`gnome-terminal --tab -- sh -c ${quote(cmd)}`, { stdio: 'ignore' });
    },
    writeToTty(tty, cmd) {
      return writeTtyDirect(tty, cmd);
    },
  },

  'konsole': {
    openTab(cmd) {
      execSync(`konsole --new-tab -e sh -c ${quote(cmd)}`, { stdio: 'ignore' });
    },
    writeToTty(tty, cmd) {
      return writeTtyDirect(tty, cmd);
    },
  },

  'windows-terminal': {
    openTab(cmd) {
      execSync(`wt -w 0 new-tab -- powershell -Command ${quote(cmd)}`, { stdio: 'ignore' });
    },
    writeToTty() {
      return false;
    },
  },

  'vscode': {
    openTab(cmd) {
      // VS Code has no CLI for opening terminal tabs; fall back to direct TTY
      console.log(`Run manually: ${cmd}`);
    },
    writeToTty(tty, cmd) {
      return writeTtyDirect(tty, cmd);
    },
  },
};

function quote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function writeTtyDirect(tty, cmd) {
  try {
    if (!fs.existsSync(tty)) return false;
    fs.writeFileSync(tty, cmd + '\n');
    return true;
  } catch {
    return false;
  }
}

function getAdapter(terminal) {
  return adapters[terminal || detect()] || null;
}

export function openTab(cmd) {
  const adapter = getAdapter();
  if (adapter) {
    adapter.openTab(cmd);
  } else {
    console.log(`  ${cmd}`);
  }
}

export function supportsWindows(terminal) {
  return typeof adapters[terminal]?.openWindow === 'function';
}

export function openWindowIn(terminal, cmd, cwd) {
  return adapters[terminal].openWindow(cmd, cwd);
}

export function openTabIn(terminal, cmd, cwd, windowId) {
  return adapters[terminal].openTab(cmd, cwd, windowId);
}

export function isKnownTerminal(terminal) {
  return Boolean(adapters[terminal]);
}

export function terminalLayout(terminal) {
  const adapter = adapters[terminal || detect()];
  if (!adapter?.layout) return new Map();
  try {
    return adapter.layout();
  } catch {
    return new Map();
  }
}

export function windowDesktops() {
  try {
    const raw = execSync('spacekit windows --json', { encoding: 'utf-8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] });
    const map = new Map();
    for (const w of JSON.parse(raw).data?.windows || []) {
      if (w.desktopUUIDs?.length) map.set(String(w.id), w.desktopUUIDs[0]);
    }
    return map;
  } catch {
    return new Map();
  }
}

export function switchDesktop(uuid) {
  try {
    execSync(`spacekit switch ${quote('uuid:' + uuid)} --json`, { stdio: 'ignore', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

export function writeToTty(tty, cmd, terminal) {
  const adapter = getAdapter(terminal);
  if (adapter) {
    return adapter.writeToTty(tty, cmd);
  }
  return writeTtyDirect(tty, cmd);
}

export function terminalName() {
  return detect() || 'unknown';
}
