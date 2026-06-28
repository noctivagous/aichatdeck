# AIChatDeck

Horizontal pages for long AI conversations. Chat with multiple providers, browse replies as swipeable pages, and persist conversations locally in SQLite.

## Features

- Multi-provider chat (OpenAI, Anthropic, Google, OpenRouter, xAI)
- Horizontal page layout for long assistant replies
- Local SQLite storage for conversations and settings
- Markdown rendering with math (KaTeX), tables, and GFM
- Configurable page width, columns, font size, and line height

## Requirements

- Node.js 20+
- npm

## Setup

```bash
npm install
cp .env.example .env.local   # optional: server-side API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure provider API keys in **Settings** (`/settings`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server (Turbopack) |
| `npm run dev:clean` | Clear `.next` cache and start dev |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Environment variables

See [`.env.example`](.env.example). API keys can be set in `.env.local` or through the in-app Settings UI. Conversation data is stored in `data/aichatdeck.db` by default.
