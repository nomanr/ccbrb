# ccbrb

Claude Code, be right back.

Save your running Claude Code sessions, close them, and bring them all back later.

## Quick start

```bash
npx ccbrb
```

This opens an interactive menu. Or use commands directly:

| Command | What it does |
|---|---|
| `npx ccbrb brb` | Save and close all running sessions |
| `npx ccbrb back` | Reopen all saved sessions |
| `npx ccbrb status` | View saved sessions |

## How it works

`brb` discovers all running Claude Code processes, resolves their session IDs and working directories, writes a manifest to `~/.claude/session-manifest.json`, and sends a graceful shutdown to each one.

`back` reads the manifest and reopens each session in its own terminal tab via `claude --resume`.

`status` shows what's saved, including session titles. Titles are pulled from Claude's session metadata, falling back to the first prompt if none exists.

## Supported terminals

iTerm2 , Terminal.app , tmux , kitty , WezTerm , GNOME Terminal , Konsole , Windows Terminal

## Requirements

Node.js >= 18 on macOS or Linux.

## License

[MIT](LICENSE)
