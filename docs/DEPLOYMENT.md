# Stacklume Deployment Guide

This guide covers deploying Stacklume to production using Vercel (recommended) or other platforms.

## Prerequisites

- Node.js 18+ installed
- pnpm 8+ installed
- A Neon PostgreSQL database
- OAuth credentials (Google and/or GitHub)
- Upstash Redis account (for rate limiting)
- Sentry account (for error monitoring)

## Quick Deploy to Vercel

1. **Fork/Clone the Repository**
   ```bash
   git clone https://github.com/your-username/stacklume.git
   cd stacklume
   ```

2. **Deploy to Vercel**

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/stacklume)

3. **Configure Environment Variables**

   Add the following environment variables in your Vercel project settings:

   ```
   # Required
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=https://your-domain.vercel.app

   # OAuth (at least one required for auth)
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GITHUB_ID=...
   GITHUB_SECRET=...

   # Rate Limiting (optional but recommended)
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...

   # Error Monitoring (optional but recommended)
   SENTRY_DSN=...
   SENTRY_AUTH_TOKEN=...

   # Analytics (optional)
   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
   ```

4. **Run Database Migrations**
   ```bash
   pnpm db:push
   ```

## Manual Deployment

### 1. Database Setup (Neon PostgreSQL)

1. Create a new project at [neon.tech](https://neon.tech)
2. Create a new database
3. Copy the connection string to `DATABASE_URL`
4. Run migrations:
   ```bash
   pnpm db:push
   ```

### 2. Authentication Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Homepage URL: `https://your-domain.com`
4. Set Authorization callback URL: `https://your-domain.com/api/auth/callback/github`

### 3. Rate Limiting (Upstash)

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy REST URL and Token to environment variables

### 4. Error Monitoring (Sentry)

1. Create account at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Copy DSN to `SENTRY_DSN`
4. Create auth token and set `SENTRY_AUTH_TOKEN`

### 5. Analytics (Plausible)

1. Create account at [plausible.io](https://plausible.io) or self-host
2. Add your domain
3. Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to your domain

## Build and Deploy

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables Reference

See [ENVIRONMENT.md](./ENVIRONMENT.md) for a complete list of environment variables.

## Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] OAuth callbacks configured with correct URLs
- [ ] Environment variables set
- [ ] Test authentication flow
- [ ] Test PWA installation
- [ ] Verify Sentry error reporting
- [ ] Check rate limiting is working
- [ ] Verify analytics tracking

## Updating

To update your deployment:

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install

# Run database migrations
pnpm db:push

# Rebuild and deploy
pnpm build
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if your IP is allowed in Neon's connection settings
- Try connecting with `?sslmode=require` appended to the URL

### OAuth Not Working
- Verify redirect URIs match exactly
- Check that client ID and secret are correct
- Ensure OAuth consent screen is configured

### Rate Limiting Issues
- Verify Upstash credentials
- Check that the rate limiter middleware is active
- Monitor Upstash dashboard for errors

### PWA Not Installing
- Verify HTTPS is enabled
- Check manifest.json is accessible
- Ensure service worker is registered
- Check browser console for errors

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the [Architecture Guide](./ARCHITECTURE.md)
