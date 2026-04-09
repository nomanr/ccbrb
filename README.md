# ccbrb

Claude Code, be right back.

Save all your running Claude Code sessions, close them, and bring them back later — across terminal restarts, reboots, whatever.

## Install

```bash
npm install -g ccbrb
```

## Usage

Run `ccbrb` for an interactive menu, or use commands directly:

```bash
ccbrb brb      # save & close all Claude sessions
ccbrb back     # reopen everything
ccbrb status   # see what's saved
```

### `ccbrb brb`

Discovers all running Claude Code processes, reads their session IDs and working directories, saves everything to a manifest, then gracefully closes them.

```
  saved chptr-mobile · fix-auth-flow
  saved my-api · add-rate-limiting

Closed 2 session(s). brb!
```

### `ccbrb back`

Reopens each saved session in a new terminal tab, resuming exactly where you left off.

```
Resuming 2 session(s)...

  back chptr-mobile · fix-auth-flow
  back my-api · add-rate-limiting

Resumed 2 session(s). Welcome back!
```

### `ccbrb status`

Shows what's in the manifest — session titles, IDs, and project paths.

```
Saved at 2026-04-09T20:10:53.961Z
Sessions 2

  chptr-mobile · fix-auth-flow
  08bf57b6-1a2b-3c4d-5e6f-789012345678
  /Users/you/projects/chptr-mobile

  my-api · add-rate-limiting
  61a8edd3-1a2b-3c4d-5e6f-789012345678
  /Users/you/projects/my-api
```

## How it works

1. **brb** — Uses `ps` to find Claude Code processes, reads their CWD via `lsof`, resolves session IDs from `~/.claude/projects/`, extracts session titles from JSONL logs, saves it all to `~/.claude/session-manifest.json`, then sends `SIGINT` to each process.

2. **back** — Reads the manifest and reopens each session via terminal-specific adapters (AppleScript for iTerm2/Terminal.app, CLI for tmux/kitty/WezTerm/etc). Falls back to direct TTY writes when possible.

3. **Session titles** — Pulled from Claude's `customTitle` field in session logs. If no title exists, falls back to the first user prompt in the conversation.

## Terminal support

| Terminal | Open tab | Resume in existing tab |
|---|---|---|
| iTerm2 | AppleScript | AppleScript (TTY match) |
| Terminal.app | AppleScript | AppleScript (TTY match) |
| tmux | `tmux new-window` | Direct TTY write |
| kitty | `kitty @ launch` | Direct TTY write |
| WezTerm | `wezterm cli spawn` | Direct TTY write |
| GNOME Terminal | `gnome-terminal --tab` | Direct TTY write |
| Konsole | `konsole --new-tab` | Direct TTY write |
| Windows Terminal | `wt new-tab` | Not supported |
| VS Code | Manual | Direct TTY write |

## Requirements

- Node.js >= 18
- macOS or Linux (uses `ps`, `lsof`)

## License

MIT
