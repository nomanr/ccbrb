# ccbrb

Claude Code, be right back.

Save your running Claude Code sessions, close them, and bring them all back later.

https://github.com/user-attachments/assets/af85e2d3-e27a-4a04-a4b7-280ab897b425

## Quick start

```bash
npx ccbrb
```

## Commands

| Command | What it does |
|---------|--------------|
| `npx ccbrb brb` | Save all running sessions and close them |
| `npx ccbrb back` | Reopen all saved sessions (skips already running ones) |
| `npx ccbrb back one` | Pick a single session to resume in the current terminal |
| `npx ccbrb status` | View saved sessions with titles and paths |

Running `npx ccbrb` without a command opens an interactive picker.

## How it works

| Command | Details |
|---------|---------|
| **brb** | Finds running Claude processes, saves their session IDs and working directories to `~/.claude/session-manifest.json`, then shuts them down. Running it again overwrites the manifest. |
| **back** | Reads the manifest, skips sessions already running, and reopens the rest in their original tabs (or new ones). |
| **back one** | Pick one session and resume it right here in the current terminal. |
| **status** | Shows saved sessions with titles and paths. Titles come from Claude's session metadata, or the first prompt if untitled. Add `--verbose` for session IDs. |

## Supported terminals

iTerm2, Terminal.app, tmux, kitty, WezTerm, GNOME Terminal, Konsole, Windows Terminal.

## Requirements

- Node.js >= 18
- macOS or Linux

## License

[MIT](LICENSE)
