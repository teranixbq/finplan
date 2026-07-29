# FinPlan

Personal finance tracker built with Hono.js, Cloudflare D1, and Drizzle ORM.

## Requirements

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account with D1 database created

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .dev.vars.example .dev.vars
# Fill in the values in .dev.vars
```

## Environment Variables

Create `.dev.vars` for local development:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
ALLOWED_EMAIL=your@email.com
SESSION_SECRET=random_64_char_string
```

For production, set these in the Cloudflare dashboard under **Settings > Environment Variables**.

## Database Migration

```bash
# Local
npm run db:migrate:local

# Production
npm run db:migrate:remote
```

## Development

```bash
npm run dev
```

App runs at `http://localhost:8787`.

## Deploy

```bash
npm run deploy
```

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer Settings > OAuth Apps > New OAuth App
2. Set **Homepage URL** to your domain
3. Set **Authorization callback URL** to `https://yourdomain.com/auth/github/callback`
4. Copy Client ID and Client Secret to environment variables
