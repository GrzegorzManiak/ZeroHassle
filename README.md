<p align="center">
  <picture>
    <source srcset="apps/mail/public/white-icon.svg" media="(prefers-color-scheme: dark)">
    <img src="apps/mail/public/black-icon.svg" alt="Zero Logo" width="64" style="background-color: #000; padding: 10px;"/>
  </picture>
</p>

# ZeroHassle

A self-hostable, AI-assisted email client for personal use.

This fork aims to keep the useful parts of Zero and strip out the SaaS overhead. The goal is simple: run your own email client with local accounts, Gmail integration, and practical AI features without wiring up a dozen paid services, dashboards, phone providers, billing systems, or analytics tools.

## What This Project Is Trying To Do

ZeroHassle is built for people who want:

- a clean self-hosted email client
- local login with password + TOTP
- Gmail linking when needed
- AI summaries, compose help, search help, and sidebar chat
- one LLM provider instead of provider sprawl
- a setup you can understand and host yourself

ZeroHassle is intentionally **not** a public SaaS product. There is no public sign-up flow. Accounts are created locally through the CLI, which makes it suitable for personal or small trusted deployments.

## Key Behavior

- Local accounts only. Public registration, forgot password, and self-service account deletion are disabled.
- Multiple accounts are supported, but they must be created by an operator with the CLI.
- TOTP is required. A newly created account must enroll on first login.
- AI uses **OpenRouter** only.
- Gmail is optional. If Google OAuth is not configured, the app still runs locally, but real Gmail linking is unavailable.

## Stack

- Frontend: React Router, React, TypeScript, TailwindCSS, shadcn/ui
- Backend: Cloudflare Workers, Hono, Drizzle ORM
- Database: PostgreSQL
- Cache and local queue support: Valkey + Upstash-compatible Redis HTTP proxy
- Auth: Better Auth with email/password + TOTP
- AI: OpenRouter
- Runtime package manager: Bun

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.2.19+
- [Docker](https://docs.docker.com/engine/install/)
- [Git](https://git-scm.com/)

### 1. Clone and install

```bash
git clone --branch staging https://github.com/GrzegorzManiak/ZeroHassle.git
cd ZeroHassle
bun install
```

### 2. Create your env file

```bash
cp .env.example .env
```

At minimum, set:

- `BETTER_AUTH_SECRET`
- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

Optional, for real Gmail linking:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

After editing `.env`, sync the generated app env files:

```bash
bun run nizzy sync
```

### 3. Start local services

```bash
bun run docker:db:up
```

This starts:

- PostgreSQL on `localhost:5432`
- Valkey on `localhost:6379`
- Upstash-compatible Redis HTTP proxy on `localhost:8079`

### 4. Push the database schema

```bash
bun run db:push
```

### 5. Create your first local user

```bash
bun run nizzy create-user
```

Then follow the prompts for email, display name, and password.

### 6. Start the app

If your Docker services are already running, use:

```bash
bun run dev
```

If you want one command that starts the local Docker stack and then boots the app, use:

```bash
bun run go
```

Command behavior:

- `bun run dev` starts the frontend and backend dev servers only
- `bun run go` runs `docker:db:up` first, then starts the dev servers

`bun run go` does **not** run `bun run db:push`, so keep step 4 in the setup flow when the schema is not initialized yet.

Open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8787](http://localhost:8787)

### 7. Sign in and enroll TOTP

The first login for a CLI-created user will redirect to TOTP setup. After that, login requires password plus authenticator code.

## Environment Notes

The recommended local flow is:

```bash
cp .env.example .env
bun run nizzy sync
```

`bun run nizzy sync` will:

- copy `.env` into app-specific env files
- update local Worker env files
- regenerate Wrangler runtime types

If you change your local Postgres port, keep these in sync:

- `DATABASE_URL` in `.env`
- the local Hyperdrive connection string in `apps/server/wrangler.jsonc`

## Required Services

For the core app, you only need:

- PostgreSQL
- Valkey / Redis proxy from the bundled Docker stack
- OpenRouter

For real Gmail usage, you also need:

- Google OAuth credentials

That is the point of this fork: avoid the old pile of extra SaaS dependencies unless they are truly necessary.

## Local Account Management

Run `bun run nizzy help` to list commands.

Main account commands:

- `bun run nizzy create-user`
- `bun run nizzy set-password`
- `bun run nizzy reset-2fa`
- `bun run nizzy delete-user`

This is the only supported way to create accounts. There is no public registration route.

## AI Features

All surviving AI features route through one OpenRouter model:

- thread and message summaries
- compose assistance
- search query generation
- sidebar chat over your mailbox

There is no provider switching UI, no agentic tool-calling stack, and no paid-plan gating.

## Useful Scripts

### App lifecycle

```bash
bun run dev
bun run go
bun run build
```

- `bun run dev`: start the app only
- `bun run go`: start Docker services, then start the app
- `bun run build`: build all workspaces

`bun run go` is the usual local boot command, but it still assumes you have already run `bun run db:push` when needed.

### Local infrastructure

```bash
bun run docker:db:up
bun run docker:db:stop
bun run docker:db:down
bun run docker:db:clean
```

### Database

```bash
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
```

### CLI

```bash
bun run nizzy
bun run nizzy help
```

### Tests

```bash
bun run test
bun run test:ui
```

## Testing

The Playwright suite uses a local CLI-managed user and TOTP enrollment flow.

If you want stable local defaults for tests, set these in `.env`:

```env
PLAYWRIGHT_EMAIL=owner@local.test
PLAYWRIGHT_PASSWORD=ZeroHassle123!
EMAIL=owner@local.test
```

Run:

```bash
bun run test
```

## Gmail Setup

If you want to connect a real Gmail account:

1. Create a Google Cloud project.
2. Enable the Gmail API and People API.
3. Create OAuth web credentials.
4. Add this callback for local dev:

```text
http://localhost:8787/api/auth/callback/google
```

5. Put the client ID and secret into `.env`.

If Google credentials are omitted, the app can still boot and local accounts still work.

## Contributing

See the [contributing guide](.github/CONTRIBUTING.md).

If you want to help with translations, see the [translation guide](.github/TRANSLATION.md).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=GrzegorzManiak/ZeroHassle&type=Timeline)](https://www.star-history.com/#GrzegorzManiak/ZeroHassle&Timeline)
