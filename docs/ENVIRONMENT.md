# Environment Variables Reference

This document lists all environment variables used by Stacklume.

## Required Variables

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/stacklume?sslmode=require` |

### Authentication

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Full URL of your application | `https://stacklume.com` |
| `NEXTAUTH_SECRET` | Random secret for session encryption (min 32 chars) | `your-super-secret-key-here-min-32-chars` |

## OAuth Providers (at least one required)

### Google OAuth

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |

### GitHub OAuth

| Variable | Description |
|----------|-------------|
| `GITHUB_ID` | OAuth App Client ID from GitHub |
| `GITHUB_SECRET` | OAuth App Client Secret |

## Optional Variables

### Rate Limiting (Upstash Redis)

| Variable | Description | Default |
|----------|-------------|---------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL | (disabled if not set) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API Token | (disabled if not set) |

### Error Monitoring (Sentry)

| Variable | Description | Default |
|----------|-------------|---------|
| `SENTRY_DSN` | Sentry Data Source Name | (disabled if not set) |
| `SENTRY_AUTH_TOKEN` | Sentry Auth Token for source maps | (no source maps) |
| `SENTRY_ORG` | Sentry organization slug | (optional) |
| `SENTRY_PROJECT` | Sentry project slug | (optional) |

### Analytics (Plausible)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Your domain for Plausible tracking | (disabled if not set) |
| `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL` | Custom Plausible script URL (for self-hosted) | `https://plausible.io/js/script.js` |

### Security

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `*` |

### Development

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |

## Generating Secrets

### NEXTAUTH_SECRET

Generate a secure secret using:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Example .env.local

```env
# Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/stacklume?sslmode=require

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-key-min-32-chars

# OAuth - Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# OAuth - GitHub
GITHUB_ID=Iv1.xxxxx
GITHUB_SECRET=xxxxx

# Rate Limiting (optional for local dev)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Error Monitoring (optional for local dev)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Analytics (optional for local dev)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=localhost
```

## Production Checklist

Before deploying to production, ensure:

1. **NEXTAUTH_SECRET** is a strong, unique secret (not the development one)
2. **NEXTAUTH_URL** points to your production domain with HTTPS
3. **DATABASE_URL** points to a production database
4. OAuth redirect URIs are configured for your production domain
5. Rate limiting is enabled to prevent abuse
6. Error monitoring is configured to catch issues
7. All secrets are stored securely (not in code)

## Environment Variable Security

- Never commit `.env` or `.env.local` to version control
- Use secret management in your deployment platform
- Rotate secrets periodically
- Use different secrets for development and production
- Restrict access to production environment variables
