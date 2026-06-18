# AI-Flow

A desktop editor for M5Stack vibe coding projects, built with Electron, React, and TypeScript. Chat uses the Claude Agent SDK; the bottom terminal connects to devices over WebSocket/Web Serial.

## Tech Stack

- **Electron** — Desktop app framework
- **React 19** — Renderer UI
- **TypeScript** — Type safety across main, preload, and renderer processes
- **electron-vite** — Build tooling for Electron
- **xterm** — Terminal emulator in the renderer
- **@anthropic-ai/claude-agent-sdk** — Project chat agent
- **electron-builder** — Packaging and distribution

## Architecture

```
src/
├── main/          # Electron main process — window management, IPC, agent
├── preload/       # Context bridge — IPC API exposed to renderer
└── renderer/      # React app — editor, chat, device terminal
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

Requires **Node.js 22+**.

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For Windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### Lint & Format

```bash
$ npm run lint
$ npm run format
```

### Type Check

```bash
$ npm run typecheck
```

## Bundled firmware (flash)

Default UIFlow2 image for device flashing:

| Context      | Path                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| Development  | `resources/firmware/aiflow-sticks3.bin`                                       |
| Packaged app | `Resources/firmware/aiflow-sticks3.bin` (macOS) under `process.resourcesPath` |

Copy your `.bin` before `npm run dev` or packaging. Binaries are gitignored; see [resources/firmware/README.md](resources/firmware/README.md).
