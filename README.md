# stdgentic

A prompt lab for macOS with a full-terminal look, inspired by cmux. It is a
desktop clone of Prompt Forge (prompt-trace): compare models, test prompt
variants, sweep temperatures, generate prompts, judge, backtranslate, score
resumes and let models talk, all from one window with a sidebar, a status bar
and a `⌘K` palette.

## How it is built

- **[Tauri 2](https://tauri.app)** wraps the app as a native `.app`, using the
  system WebKit view. The Rust side only creates the window and provides the
  native save dialog for exports.
- **Next.js** is used purely as a static site generator (`output: 'export'`).
  `pnpm build` emits `out/`, which Tauri bundles. There is no server: no API
  routes, no server actions, no database, no accounts, no telemetry.
- The look comes from the tokens in `app/globals.css`: one ANSI palette that
  every shadcn component reads, monospace everywhere, no radius, no shadows.
- `lib/nav.ts` is the single list of tools. The sidebar, the palette, the
  `⌘1`-`⌘9` shortcuts and the home page all read it, so a new tool only needs
  an entry there.

The only host the app ever contacts is `https://openrouter.ai`.

## Your key

Model calls are billed to your own [OpenRouter](https://openrouter.ai/keys) key,
which is stored in the app's local storage under `pf:openrouter_key` and is
sent to openrouter.ai and nowhere else.

## Shortcuts

| Keys | Action |
|---|---|
| `⌘K` | command palette |
| `⌘1`-`⌘9` | jump to a tool |
| `⌘↵` | run, inside a prompt field |
| `⌘,` | settings |

## Commands

Needs Rust (`rustup`) and the Xcode command line tools.

```bash
pnpm install
pnpm tauri dev            # the desktop app, with hot reload
pnpm tauri build          # .app and .dmg in src-tauri/target/release/bundle/
pnpm dev                  # the same UI in a browser, http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
```
