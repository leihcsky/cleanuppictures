# Pic Cleaner

Pic Cleaner is an AI photo cleanup tool for removing unwanted objects, text, people, shadows, and glare from images online.

## Website

- Production: [https://cleanuppictures.org](https://cleanuppictures.org)

## What This Project Includes

- Next.js App Router web app
- AI-powered image cleanup workflows
- Account system with usage limits and billing
- Order/refund/subscription management APIs

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Configuration (high level)

- Copy environment values into `.env.local`
- Set database credentials and run SQL schema under `sql/`
- Configure storage/CDN (Cloudflare R2 if used)
- Configure payment provider (Stripe or Creem)
- Configure auth provider keys if login is enabled

## Notes

- Keep secrets in environment files only.
- For production deployment, configure domain, webhook endpoints, and provider keys.

