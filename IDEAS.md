# Ideas

Improvements for stdgentic, grouped by effort.

## Quick wins

| Idea | Why | How |
|---|---|---|
| Remember window size and position | Every Mac app does this. Today it always opens at 1280x820 | `tauri-plugin-window-state`, one line in `src-tauri/src/lib.rs` |
| Update `SPEC.md` | It still says "Prompt Forge" and describes the web version | Docs only |
| Align the in-app copy with the README | The home page, key form and palette still say OpenRouter | Copy only, then retake `docs/screenshots/home.jpg` |
| Native macOS menu with the shortcuts | Mac users look for `⌘K` and `⌘1-9` in the menus | Tauri's menu API |
| Respect `prefers-reduced-motion` | The blinking cursor animates nonstop | A few lines in `app/globals.css` |

## cmux identity

1. **Activity indicators in the sidebar**: `●` while a tool is streaming, `◆`
   when it finished while you were on another tool. Needs a
   `{ route: status }` map in the store, fed by `use-model-runs.ts`.
2. **System notification** when a run finishes with the window out of focus,
   via `plugin-notification`.
3. **Resizable splits**: drag the borders between compare columns, with
   `react-resizable-panels`.
4. **Vim navigation**: `h`/`l` move focus between panes, `j`/`k` scroll, `/`
   opens the palette. The pane borders already light up on focus.
5. **Switchable themes** (Catppuccin, Gruvbox, Tokyo Night): swap the
   `--ansi-*` tokens. Needs a palette command and one value in the store.

## Desktop advantages

- **API key in the macOS Keychain** instead of `localStorage`. The biggest
  security win: today the key sits in plain text in the webview's data folder.
- **History saved to a file** in the app's data folder, without the 50-entry
  limit or the trimming when local storage fills up.
- **Global shortcut** (for example `⌥Space`) to summon a quick prompt from any
  app, Raycast style, via `plugin-global-shortcut`.

## Distribution

- **Signing and notarization**, so the `.dmg` opens on other Macs without
  Gatekeeper blocking it. Needs an Apple Developer account.
- **GitHub Actions with `tauri-action`**: every tag builds the `.dmg` and
  publishes a Release. Also avoids the Finder error in the local DMG build.
- **Auto-update** with `plugin-updater`, pointed at the GitHub Releases.
- **Web build** of the same code: the static export already works, it only
  needs the sidebar's traffic-light padding applied under Tauri alone.

## Product direction

The name promises agents, but today the app is a harness lab for prompts. Two
paths:

- **Deliver on "agentic"**: tool use, MCP and multi-step agents, with the run
  visible in panes. A big step.
- **Lean on "harness"**: evals, test suites for prompts, regressions between
  model versions.

## Top 3

1. Keychain: real security, and small.
2. Sidebar activity indicators plus notifications: what makes it feel like
   cmux.
3. Releases via GitHub Actions: makes the app installable by other people.
