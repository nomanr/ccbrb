# ccbrb

Claude Code, be right back.

Save your running Claude Code sessions, close them, and bring them all back later.

## Quick start

```bash
npx ccbrb
```

## Commands

| Command | What it does |
|---------|--------------|
| `npx ccbrb brb` | Save all running sessions and close them |
| `npx ccbrb back` | Reopen all saved sessions in new tabs |
| `npx ccbrb status` | View saved sessions with titles and paths |

Running `npx ccbrb` without a command opens an interactive picker.

## How it works

**brb** finds every running Claude Code process, resolves session IDs and working directories via `~/.claude/projects/`, saves a manifest to `~/.claude/session-manifest.json`, and gracefully shuts each one down.

**back** reads the manifest and reopens each session in its own terminal tab using `claude --resume`. It matches sessions back to their original TTY when possible, or opens new tabs.

**status** prints saved sessions with their titles. Titles come from Claude's session metadata. If a session has no title, the first prompt from the conversation is shown instead.

## Supported terminals

iTerm2, Terminal.app, tmux, kitty, WezTerm, GNOME Terminal, Konsole, Windows Terminal.

## Requirements

- Node.js >= 18
- macOS or Linux

## License

[MIT](LICENSE)
