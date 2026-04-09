# First90 — AI onboarding planner

Marketing site and backend scaffolding for **First90**, an AI-assisted 30‑60‑90 day onboarding product (tagline: *Your first 90 days, engineered for impact.*).

The public UI is a single landing page (hero, product story, Chart.js demos, waitlist-oriented CTAs). Data and auth for the full product are modeled in **Convex**; email capture can go through **Beehiiv** via a Next.js route handler.

## Stack

| Layer | Choice |
|--------|--------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router), `src/app` |
| UI | React 19, Tailwind CSS 3, Google fonts (Inter, Instrument Serif, Space Grotesk) |
| Charts | [Chart.js](https://www.chartjs.org/) |
| Backend (schema + auth) | [Convex](https://www.convex.dev/) + [`@convex-dev/auth`](https://www.npmjs.com/package/@convex-dev/auth) (password provider) |
| Newsletter | [Beehiiv](https://www.beehiiv.com/) API (`POST /api/subscribe`) |

## Prerequisites

- **Node.js** 20+ (recommended; matches common Next.js support)
- **Convex** account and CLI if you use the Convex backend locally or in prod

## Setup

```bash
npm install
```

### Environment variables

Create `.env.local` in the project root.

**Waitlist / Beehiiv** (required for `POST /api/subscribe`):

| Variable | Purpose |
|----------|---------|
| `BEEHIIV_API_KEY` | Bearer token for Beehiiv API v2 |
| `BEEHIIV_PUBLICATION_ID` | Publication UUID in the subscription URL |

**Convex** — after `npx convex dev` (or deploy), add the values Convex prints, typically:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL for the client |
| `CONVEX_DEPLOY_KEY` / deploy config | As per [Convex Next.js docs](https://docs.convex.dev/client/react/next) |

> The subscription route references a specific Beehiiv `automation_ids` entry; change that in `src/app/api/subscribe/route.js` if you use a different automation.

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Convex (optional, for backend work)

```bash
npx convex dev
```

This syncs `convex/` functions and schema. Auth is configured in `convex/auth.js`; tables live in `convex/schema.js` (users, onboarding intake, plans, phases, weeks, activities, goals, stakeholders, reflections, etc.).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Project layout

```
src/
  app/
    layout.js          # Root layout, fonts, theme script, metadata
    page.js            # Landing page sections
    globals.css
    api/subscribe/
      route.js         # Beehiiv subscription proxy
  components/ui/      # Navbar, Hero, feature blocks, charts, footer
  lib/utils.js
convex/
  schema.js           # App data model + auth tables
  auth.js             # Convex Auth (password)
  http.js             # HTTP router (extend as needed)
public/               # Static assets
```

## API

### `POST /api/subscribe`

JSON body:

```json
{
  "email": "you@example.com",
  "firstName": "Ada",
  "utmSource": "first90",
  "utmMedium": "website",
  "utmCampaign": "waitlist"
}
```

Returns `201` with `{ "message": "Successfully subscribed" }` on success, or `4xx`/`5xx` with `{ "error": "..." }`.

## Security headers

`next.config.mjs` sets HSTS, frame options, XSS protection, referrer policy, and related headers for all routes.

## Deploy

Usual path: **Vercel** for Next.js, **Convex Cloud** for the backend. Set the same env vars in Vercel; run `npx convex deploy` for production Convex functions.

## License

Private / not licensed for redistribution unless you add a license file.
