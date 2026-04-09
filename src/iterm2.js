import { execSync } from 'node:child_process';

function osascript(script) {
  return execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
    encoding: 'utf-8',
    timeout: 10000,
  }).trim();
}

export function isIterm2Running() {
  try {
    const result = osascript(
      'tell application "System Events" to (name of processes) contains "iTerm2"'
    );
    return result === 'true';
  } catch {
    return false;
  }
}

export function listTabPids() {
  const script = `
tell application "iTerm2"
  set pidList to {}
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        set end of pidList to (id of s) & ":" & (tty of s)
      end repeat
    end repeat
  end repeat
  set AppleScript's text item delimiters to linefeed
  return pidList as text
end tell`;

  try {
    const output = osascript(script);
    if (!output) return [];
    return output.split('\n').map(line => {
      const [sessionUniqueId, tty] = line.split(':');
      return { sessionUniqueId, tty };
    });
  } catch {
    return [];
  }
}

export function getTtyPid(tty) {
  try {
    const output = execSync(
      `ps -t ${tty} -o pid=,command= 2>/dev/null`,
      { encoding: 'utf-8' }
    ).trim();
    return output;
  } catch {
    return '';
  }
}

export function openTab(command) {
  const escapedCmd = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `
tell application "iTerm2"
  tell current window
    create tab with default profile
    tell current session
      write text "${escapedCmd}"
    end tell
  end tell
end tell`;
  osascript(script);
}

export function sendCtrlC(tty) {
  const script = `
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is "${tty}" then
          tell s to write text (ASCII character 3)
        end if
      end repeat
    end repeat
  end repeat
end tell`;
  osascript(script);
}

export function closeTabByTty(tty) {
  const script = `
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is "${tty}" then
          tell s to close
        end if
      end repeat
    end repeat
  end repeat
end tell`;
  osascript(script);
}
