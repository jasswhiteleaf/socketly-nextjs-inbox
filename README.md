# Socketly Next.js inbox starter

A complete Next.js App Router application with email/password sign-in, workspaces,
a persistent notification bell and inbox, three branding presets, and a real CSV export
that sends a notification only after the file is saved.

Requires Node 22, npm, a separate PostgreSQL database for this application, and a
Socketly account. All four Socketly packages are pinned to the published
`0.3.0-beta.1` release. No monorepo or private packages are needed.

## Try it

- [Live inbox demo](https://docs.socketly.co/inbox)
- [Setup guide](https://docs.socketly.co/starter)
- [Socketly account](https://app.socketly.co)

This repository contains the open-source starter application. It connects to Socketly's hosted inbox beta. The Socketly service is maintained separately.

## Run locally

1. Clone the starter, then install and configure it:

   ```sh
   git clone https://github.com/jasswhiteleaf/socketly-nextjs-inbox.git
   cd socketly-nextjs-inbox
   ```

   ```sh
   npm ci
   npm run setup
   docker compose up -d --wait
   ```

   Docker is optional: use an existing **separate app database** instead. The compose
   database binds only to localhost:55432 and persists in `starter_database`.
   Its example password is for local development only. Never point this starter at
   Socketly's service database. The migration refuses recognizable service tables.

2. In [Socketly](https://app.socketly.co), create an app. Copy its public key and secret
   into `.env.local` as `NEXT_PUBLIC_SOCKETLY_KEY` and `SOCKETLY_SECRET`.
   Enable the app's **Inbox** setting and add the allowed origin `localhost:3000`.
   The hosted service must have inbox creation enabled; self-hosted operators set
   `INBOX_ENABLED=true`. Do not put the secret in a `NEXT_PUBLIC_*` variable.

3. Check `DATABASE_URL` in `.env.local`: it is your starter app's auth/export database.
   `npm run setup` generated a random private `BETTER_AUTH_SECRET` without displaying it.
   Keep `BETTER_AUTH_URL=http://localhost:3000`, then run:

   ```sh
   npm run db:migrate
   npm run dev
   ```

4. Open [localhost:3000](http://localhost:3000), create an account, create a workspace,
   then select **Create CSV export**. Open the notification to download the generated
   CSV. The first export has a header and no prior export rows. The next contains your
   previous export. Mark it read, reload, archive it, and try the other themes.

Restart Next.js after editing `.env.local`. With a custom port, update
`BETTER_AUTH_URL` and Socketly's allowed origin to match.

## What is included

- Better Auth backed by PostgreSQL: real password hashing, sessions, sign-in/out,
  workspace creation/selection, membership checks and database-backed rate limits.
- A server token endpoint that derives recipient and tenant from the authenticated
  session and current membership. Browser recipient/tenant overrides are not accepted.
- One `InboxProvider` shared by the bell and list, reset on identity changes.
  Workspace changes and sign-out unmount it immediately. Other tabs revalidate their
  session after an app sign-in/workspace event or when they regain focus.
- `InboxTheme` presets for fonts, colors and corners; change the token objects in
  `src/app/ui.tsx` to match your brand. Host fonts are inherited; no external font fetch.
- A real CSV export of the current user's export history, stored in PostgreSQL and
  downloadable only by that user in that workspace. Requests are limited to ten new
  exports per minute per user/workspace. Demo history is limited to the latest 100 rows.
- Durable export request keys and stable notification idempotency keys. A failed
  notification leaves the export available; **Retry notification** reuses the saved
  request key while this page remains open. The saved export list also offers retries after reload. Successful requests do not resend.

The forms and theme/workspace selectors use the same reusable Base UI controls as Socketly.
Their source is included under `src/components/ui`, with no private runtime dependency.

## Files to adapt

| File                                | Responsibility                                                 |
| ----------------------------------- | -------------------------------------------------------------- |
| `src/lib/runtime.ts`                | Auth configuration and the app database                        |
| `src/lib/access.ts`                 | Session, membership and same-origin checks                     |
| `src/app/api/inbox/token/route.ts`  | Short-lived scoped inbox tokens                                |
| `src/app/api/exports/route.ts`      | Save an export, then notify its verified owner                 |
| `src/app/api/exports/[id]/route.ts` | Authorized file download                                       |
| `src/app/ui.tsx`                    | Auth forms, workspaces, provider, bell, inbox and theme tokens |

The Socketly secret stays in server-only modules. The only identity props passed to
the UI are the signed-in user's ID and their workspace memberships. The token response
has `Cache-Control: private, no-store`; the client checks its identity header before
using a refreshed token. Custom write endpoints require the configured app origin.

## Deploy your copy

1. Provision a separate durable PostgreSQL database and configure a deployment's
   environment from `.env.example`. Use a new random session secret, the database
   provider's recommended TLS settings, and your final HTTPS `BETTER_AUTH_URL`.
   Use a connection pool appropriate for your hosting plan.
2. Add the deployed browser origin to your Socketly app. The public and server URL
   values should point at the same Socketly service. Never deploy `.env.local`.
3. Run `npm ci`, then apply `npm run db:migrate` in a trusted environment connected to
   that app database (the command expects a local `.env.local`; a protected temporary
   environment file works). This is an additive initial migration, not a backup tool.
4. Run `npm run build` and deploy with `npm start`, or use Vercel's Next.js preset.
   Public variables are embedded at build time. Keep server credentials on the server.
5. Verify two accounts cannot access each other's exports or inboxes. Test workspace
   switching, sign-out, reload persistence, a blocked origin, and a notification retry.

This is a working integration starter, not a full identity or background-job product.
Email verification, password recovery, invitations, billing and email delivery are not
configured. Add your mail provider and the appropriate Better Auth flows before an
open signup launch. The sample export runs during the HTTP request; long-running work
belongs in your existing job runner. There is no automatic export retry worker here.
After a page reload a pending export remains downloadable and offers a saved-notification retry. Retries older than 23 hours require manual reconciliation,
because Socketly retains notification idempotency keys for 24 hours. Schedule retention
for your application's export records as your use case requires.

Inbox beta limits: 30-day notification retention, 10,000 stored notifications and
recipients per app, 100 creates/minute, 16 KiB payloads. Live invalidations and retries
use normal transport allowance. Persistence is not proof that a user viewed a notification.
See [inbox docs](https://docs.socketly.co/inbox).

## Verification

```sh
npm run typecheck
npm run build
npx playwright install chromium
# Start the configured app separately, then:
STARTER_TEST_URL=http://localhost:3000 npm run test:e2e
```

The browser test creates disposable users and workspaces in **your configured app
database**, generates exports, and sends real notifications through the configured
Socketly app. Use a dedicated test app/database. It never needs Socketly's service DB.
Do not run against a shared/customer app unintentionally.

Authentication follows the official [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
and [organization plugin](https://better-auth.com/docs/plugins/organization).

MIT licensed. See LICENSE.
