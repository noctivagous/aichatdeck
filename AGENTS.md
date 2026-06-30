# AIChatDeck — Agent Guide

## Quick start

```bash
npm install             # no lockfile needed — uses `npm`
cp .env.example .env.local   # optional: server-side API keys
npm run dev             # next dev --turbopack --hostname 0.0.0.0
npm run dev:clean       # rm -rf .next && npm run dev
npm run lint            # ESLint 9 (flat config, next/core-web-vitals)
npm run build           # next build
npm run start           # next start --hostname 0.0.0.0
```

**No test, typecheck, or CI scripts exist.** Run `npx tsc --noEmit` for type checking if needed.

## Architecture

- **Next.js 16.2** + Turbopack (dev), **React 19.2**, **TypeScript 6.0**, **Tailwind 4.3**, **PostCSS**
- Single package (no workspaces / monorepo)
- Path alias `@/*` → `./src/*`

### Directory layout

```
src/
  app/            # Next.js App Router pages & API routes
    chat/[id]/    # Chat session (horizontal slides)
    settings/     # Provider config UI
    dev/page-card/# Component dev page
  components/
    chat/         # Chat UI (ChatSession, SlidesTrack, Composer, SessionOutlineSidebar, etc.)
    ui/           # Radix UI primitives (button, dialog, select, etc.)
  hooks/          # React hooks wrapping localStorage settings
  lib/
    server/       # Server-only: SQLite operations, settings persistence
    storage/      # Client-side: fetch-based API wrappers
    providers/    # One file per provider (openai, anthropic, google, openrouter, xai)
    keybindings/  # Custom keyboard binding system
    session-outline.ts  # Extract markdown headings from messages into a navigable outline
    scroll-to-heading.ts# Scroll within a slide to a heading by slug
    chat-navigation.ts  # URL query-param navigation (?page=&heading=)
```

## Storage

- **sql.js** (WASM SQLite) running server-side
- DB at `data/aichatdeck.db` by default, overridable via `AICHATDECK_DB_PATH` env var
- Two tables: `conversations`, `app_settings`
- Schema migrations run on open (add columns if missing)
- All writes go through `withPersist()` which serializes operations and writes to disk
- `serverExternalPackages: ["sql.js"]` in `next.config.ts` (required for server-side WASM)

## Chat & page system

Core concept: conversations are split into horizontally-scrollable "pages" (slides).

- `computePages(messages, pageBreaks)` → `PageView[]` (see `src/lib/pages.ts`)
- Page breaks are message indices stored as `pageBreaks: number[]`
- Live page (last chunk) splits at `MESSAGES_PER_PAGE = 12` messages
- `ProviderId: "openai" | "anthropic" | "google" | "openrouter" | "xai"`
- Model refs encoded as `"provider:modelId"` string
- API keys: Settings UI (stored in SQLite) OR `.env.local`; UI keys take precedence

## Keybindings

Custom hook-based system (`useKeybindings` with `KeybindingsProvider` context).
Key bindings are scoped (e.g., `"composer"`, `"global"`).
See `src/lib/keybindings/` and `src/hooks/useKeybindings.ts`.

Registered global bindings: `Alt+M` → main menu (`/`).

## Theme

Dark mode follows OS `prefers-color-scheme` via `ThemeProvider`. No toggle. Uses `.dark` class on `<html>`.

## CSS

Tailwind v4 (`@import "tailwindcss"`, `@custom-variant dark`). No `tailwind.config.js` — uses `@theme` directive in `globals.css` for custom tokens.

## Env vars

| Variable | Purpose |
|---|---|
| `AICHATDECK_DB_PATH` | Override SQLite DB path (default `data/aichatdeck.db`) |
| `OPENAI_API_KEY` | Server-side provider key |
| `ANTHROPIC_API_KEY` | Server-side provider key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Server-side provider key |
| `OPENROUTER_API_KEY` | Server-side provider key |
| `XAI_API_KEY` | Server-side provider key |

## Notable patterns

- Components are `"use client"` by default (client-side rendering)
- Settings are migrated via `migrateSettings()` (v1 legacy → v2 current)
- `persistTimerRef` debounces message persistence (900ms while streaming, 0ms when idle)
- `gui-refs/` directory contains static HTML prototypes for design reference
- `tasks/TASKS.txt` contains planned features (not actionable)
