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
| `npx ccbrb back` | Reopen all saved sessions (skips already running ones) |
| `npx ccbrb back one` | Pick a single session to resume in the current terminal |
| `npx ccbrb status` | View saved sessions with titles and paths |

Running `npx ccbrb` without a command opens an interactive picker.

## How it works

**brb** finds every running Claude Code process, resolves session IDs and working directories via `~/.claude/projects/`, saves a manifest to `~/.claude/session-manifest.json`, and gracefully shuts each one down. Running `brb` again overwrites the previous manifest.

**back** reads the manifest, checks which sessions are already running, and only reopens the ones that aren't. Sessions resume in their original terminal tabs when possible, otherwise new tabs are opened.

**back one** lets you pick a single session from the manifest and resumes it directly in the current terminal. Useful when you want to get back into one specific session without opening everything.

**status** prints saved sessions with their titles and paths. Titles come from Claude's session metadata. If a session has no title, the first prompt from the conversation is shown instead. Use `--verbose` to include session IDs.

## Supported terminals

iTerm2, Terminal.app, tmux, kitty, WezTerm, GNOME Terminal, Konsole, Windows Terminal.

## Requirements

- Node.js >= 18
- macOS or Linux

## License

[MIT](LICENSE)
