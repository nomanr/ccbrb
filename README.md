# ccbrb

Claude Code, be right back.

Save your running Claude Code sessions, close them, and bring them all back later.

## Usage

```bash
npx ccbrb
```

Pick from the interactive menu, or run a command directly:

```bash
npx ccbrb brb      # save & close all sessions
npx ccbrb back     # reopen saved sessions
npx ccbrb status   # view saved sessions
```

## How it works

**brb** finds all running Claude Code processes, grabs their session IDs and working directories from `~/.claude/projects/`, saves everything to a manifest at `~/.claude/session-manifest.json`, and gracefully shuts them down.

**back** reads the manifest and reopens each session in a new terminal tab using `claude --resume`.

**status** prints what's saved -- project names, session titles, IDs, and paths.

Session titles come from Claude's own session metadata. If a session has no title, the first prompt in the conversation is used instead.

## Supported terminals

iTerm2, Terminal.app, tmux, kitty, WezTerm, GNOME Terminal, Konsole, Windows Terminal.

## Requirements

- Node.js >= 18
- macOS or Linux

## License

[MIT](LICENSE)
