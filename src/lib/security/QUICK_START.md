# SSRF Protection - Quick Start Guide

## 1-Minute Integration Guide

### For API Routes

Add SSRF protection to any API route that accepts URLs from users:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  // Validate URL for SSRF attacks
  const validation = await validateUrlForSSRF(url);

  if (!validation.safe) {
    return NextResponse.json(
      { error: `Security validation failed: ${validation.reason}` },
      { status: 403 }
    );
  }

  // Use the validated URL
  const safeUrl = validation.validUrl!;

  // Your logic here...
  const response = await fetch(safeUrl.toString());
}
```

### What Gets Blocked

- Private IPs: `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`
- Cloud metadata: `169.254.169.254`
- Internal domains: `.local`, `.internal`
- Bad protocols: `file://`, `ftp://`, etc.

### What Gets Allowed

- Public HTTP/HTTPS URLs only
- Normal websites, APIs, CDNs
- YouTube, GitHub, Steam, etc.

## Example Responses

### Blocked Request
```bash
POST /api/scrape
{ "url": "http://localhost:3000" }

Response: 403 Forbidden
{
  "error": "Security validation failed: Internal or reserved hostname not allowed"
}
```

### Valid Request
```bash
POST /api/scrape
{ "url": "https://example.com" }

Response: 200 OK
{
  "title": "Example Domain",
  "description": "...",
  ...
}
```

## Testing Your Integration

1. Try a valid URL: `https://example.com` → Should work
2. Try localhost: `http://localhost` → Should be blocked
3. Try private IP: `http://192.168.1.1` → Should be blocked
4. Try metadata: `http://169.254.169.254` → Should be blocked

## Need More Details?

- Full documentation: `README.md`
- Implementation summary: `../../../SSRF_PROTECTION_SUMMARY.md`
- Test examples: `ssrf-protection.test.ts`
