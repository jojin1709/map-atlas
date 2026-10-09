# Contributing to Map Atlas

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/jojin1709/map-atlas.git
cd map-atlas
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

```
src/
  engine/       # Framework-free map engine (core logic)
  services/     # API calls and geo utilities
  components/   # React components (library + demo)
  index.ts      # Public library entry point
```

## Development Rules

- **Engine code** (`src/engine/`) must stay framework-free — no React imports
- **Library exports** go through `src/index.ts` only
- **Demo components** (SearchPanel, ToolsPanel, etc.) are app-only, not exported
- Run `npm run build:lib` to verify the library builds
- Run `npm run build:demo` to verify the demo builds

## Pull Requests

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test locally: `npm run dev`
5. Verify builds: `npm run build:lib && npm run build:demo`
6. Commit with a clear message
7. Open a PR

## Code Style

- TypeScript strict mode
- No comments unless asked
- Follow existing patterns in the codebase
- Keep the engine dependency-free
