# SSRF Protection Architecture

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER REQUEST                                │
│                     POST /api/scrape                                 │
│                  { "url": "http://example.com" }                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SCRAPE API ROUTE HANDLER                          │
│                  src/app/api/scrape/route.ts                         │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      URL EXTRACTION                                  │
│                  const { url } = await request.json()                │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SSRF VALIDATION START                              │
│             await validateUrlForSSRF(url)                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ STEP 1: URL PARSING                                        │    │
│  │ ----------------------------------------                    │    │
│  │ • Parse URL with URL constructor                           │    │
│  │ • Validate URL format                                      │    │
│  │ • Extract protocol, hostname, port                         │    │
│  │                                                             │    │
│  │ ❌ Invalid format → Return 403 "Invalid URL format"        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ STEP 2: PROTOCOL VALIDATION                                │    │
│  │ ----------------------------------------                    │    │
│  │ • Check if protocol is HTTP or HTTPS                       │    │
│  │ • Block dangerous protocols:                               │    │
│  │   - file://                                                │    │
│  │   - ftp://                                                 │    │
│  │   - gopher://                                              │    │
│  │   - data://                                                │    │
│  │                                                             │    │
│  │ ❌ Bad protocol → Return 403 "Only HTTP/HTTPS allowed"     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ STEP 3: HOSTNAME VALIDATION                                │    │
│  │ ----------------------------------------                    │    │
│  │ • Check against internal hostname patterns:                │    │
│  │   - localhost                                              │    │
│  │   - *.local (mDNS)                                         │    │
│  │   - *.internal                                             │    │
│  │   - metadata.google.internal                               │    │
│  │                                                             │    │
│  │ ❌ Internal hostname → Return 403 "Internal hostname"      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ STEP 4: DIRECT IP CHECK                                    │    │
│  │ ----------------------------------------                    │    │
│  │ • If hostname is already an IP, check ranges:              │    │
│  │   - 127.0.0.0/8 (loopback)                                 │    │
│  │   - 10.0.0.0/8 (private)                                   │    │
│  │   - 172.16.0.0/12 (private)                                │    │
│  │   - 192.168.0.0/16 (private)                               │    │
│  │   - 169.254.169.254 (cloud metadata)                       │    │
│  │   - fe80::/10, ::1 (IPv6)                                  │    │
│  │                                                             │    │
│  │ ❌ Private IP → Return 403 "Private IP not allowed"        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ STEP 5: DNS RESOLUTION                                     │    │
│  │ ----------------------------------------                    │    │
│  │ • Resolve hostname to IP address via DNS lookup            │    │
│  │ • This prevents DNS rebinding attacks                      │    │
│  │ • Get actual IP the hostname resolves to                   │    │
│  │                                                             │    │
│  │ ❌ DNS fails → Return 403 "Failed to resolve hostname"     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ STEP 6: RESOLVED IP VALIDATION                             │    │
│  │ ----------------------------------------                    │    │
│  │ • Check resolved IP against private ranges                 │    │
│  │ • Same checks as STEP 4 but on resolved IP                 │    │
│  │ • Prevents attacker-controlled DNS pointing to private IPs │    │
│  │                                                             │    │
│  │ ❌ Resolves to private IP → Return 403 "Resolves to        │    │
│  │                             private IP: X.X.X.X"            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ VALIDATION PASSED                                       │    │
│  │ ----------------------------------------                    │    │
│  │ Return: { safe: true, validUrl: URL }                      │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Is validation.safe?   │
              └───────────┬───────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
          NO                            YES
           │                             │
           ▼                             ▼
┌──────────────────────┐    ┌────────────────────────────┐
│ RETURN 403 FORBIDDEN │    │  PROCEED WITH SCRAPING     │
│                      │    │                            │
│ {                    │    │ • Use validUrl for fetch   │
│   "error": "..."     │    │ • Playwright scraping      │
│ }                    │    │ • Platform detection       │
└──────────────────────┘    │ • Return metadata          │
                            │                            │
                            └─────────────┬──────────────┘
                                          │
                                          ▼
                            ┌────────────────────────────┐
                            │  RETURN 200 OK             │
                            │                            │
                            │ {                          │
                            │   "title": "...",          │
                            │   "description": "...",    │
                            │   "imageUrl": "...",       │
                            │   ...                      │
                            │ }                          │
                            └────────────────────────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│                  (Browser/Frontend)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ POST /api/scrape
                         │ { url: "..." }
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTE                         │
│              /api/scrape/route.ts                            │
│  ┌──────────────────────────────────────────────────┐       │
│  │  1. Extract URL from request body                │       │
│  │  2. Call validateUrlForSSRF()                    │       │
│  │  3. Check validation result                      │       │
│  │  4. Proceed or reject                            │       │
│  └──────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ import
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               SSRF PROTECTION MODULE                         │
│          src/lib/security/ssrf-protection.ts                 │
│  ┌──────────────────────────────────────────────────┐       │
│  │  validateUrlForSSRF(url)                         │       │
│  │  ├─ validateUrlForSSRFSync()                     │       │
│  │  ├─ hasValidProtocol()                           │       │
│  │  ├─ isInternalHostname()                         │       │
│  │  ├─ isPrivateIP()                                │       │
│  │  └─ resolveAndCheckIP()                          │       │
│  │       └─ dns.lookup()                            │       │
│  └──────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Uses Node.js DNS
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     NODE.JS DNS                              │
│                   (System DNS)                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Resolves hostname to IP address                 │       │
│  │  Returns: { address: "1.2.3.4" }                 │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Defense Layers

```
Layer 1: Protocol Validation
├─ ✅ Allow: http://, https://
└─ ❌ Block: file://, ftp://, data://, etc.

Layer 2: Hostname Pattern Matching
├─ ✅ Allow: Public domain names
└─ ❌ Block: localhost, *.local, *.internal

Layer 3: Direct IP Detection
├─ ✅ Allow: Public IP addresses
└─ ❌ Block: 127.x.x.x, 10.x.x.x, 192.168.x.x, etc.

Layer 4: DNS Resolution
├─ Resolve hostname → IP address
└─ Detect DNS rebinding attempts

Layer 5: Resolved IP Validation
├─ ✅ Allow: Public IPs
└─ ❌ Block: Private IPs (even if DNS points there)

Layer 6: Cloud Metadata Protection
├─ ✅ Allow: Normal cloud services
└─ ❌ Block: 169.254.169.254, metadata.google.internal
```

## Attack Prevention Examples

### Attack 1: Direct Private IP Access
```
User Input: http://192.168.1.100:8080/admin
    ↓
Layer 3: Direct IP Detection
    ↓
Blocked: "Private or reserved IP address not allowed"
```

### Attack 2: Localhost with Different Notation
```
User Input: http://localhost:3000
    ↓
Layer 2: Hostname Pattern Matching
    ↓
Blocked: "Internal or reserved hostname not allowed"
```

### Attack 3: Cloud Metadata Service
```
User Input: http://169.254.169.254/latest/meta-data/
    ↓
Layer 3: Direct IP Detection (cloud metadata IP)
    ↓
Blocked: "Private or reserved IP address not allowed"
```

### Attack 4: DNS Rebinding
```
User Input: http://evil-domain.com
    ↓
Layer 1-3: Pass (valid protocol, not internal hostname, not direct IP)
    ↓
Layer 4: DNS Resolution
    └─ evil-domain.com → 127.0.0.1
    ↓
Layer 5: Resolved IP Validation
    ↓
Blocked: "Hostname resolves to private IP: 127.0.0.1"
```

### Attack 5: File System Access
```
User Input: file:///etc/passwd
    ↓
Layer 1: Protocol Validation
    ↓
Blocked: "Only HTTP and HTTPS protocols are allowed"
```

## Performance Characteristics

```
┌─────────────────────────────────┬──────────────┬─────────────┐
│ Validation Step                 │ Time (avg)   │ Can Cache?  │
├─────────────────────────────────┼──────────────┼─────────────┤
│ URL Parsing                     │ < 1ms        │ No          │
│ Protocol Check                  │ < 1ms        │ No          │
│ Hostname Pattern Match          │ < 1ms        │ No          │
│ Direct IP Range Check           │ < 1ms        │ No          │
│ DNS Resolution                  │ 10-100ms     │ Yes (short) │
│ Resolved IP Check               │ < 1ms        │ No          │
├─────────────────────────────────┼──────────────┼─────────────┤
│ TOTAL (without DNS)             │ ~1-2ms       │ -           │
│ TOTAL (with DNS)                │ 10-100ms     │ -           │
└─────────────────────────────────┴──────────────┴─────────────┘

Note: DNS resolution is the main performance cost but is necessary
for complete protection against DNS rebinding attacks.
```

## Security Posture Matrix

```
┌──────────────────────────┬──────────┬───────────────────────┐
│ Attack Vector            │ Status   │ Protection Method     │
├──────────────────────────┼──────────┼───────────────────────┤
│ Direct Private IP        │ ✅ BLOCKED│ IP range check        │
│ Cloud Metadata (AWS)     │ ✅ BLOCKED│ IP range check        │
│ Cloud Metadata (GCP)     │ ✅ BLOCKED│ Hostname pattern      │
│ Localhost                │ ✅ BLOCKED│ Hostname pattern      │
│ Internal Domain (.local) │ ✅ BLOCKED│ Hostname pattern      │
│ DNS Rebinding            │ ✅ BLOCKED│ DNS resolution check  │
│ File Protocol            │ ✅ BLOCKED│ Protocol check        │
│ IPv6 Private             │ ✅ BLOCKED│ IPv6 range check      │
│ Port Scanning            │ ✅ BLOCKED│ Private IP block      │
│ Public URLs              │ ✅ ALLOWED│ Validation passes     │
└──────────────────────────┴──────────┴───────────────────────┘
```

## Integration Points

```
Current Implementation:
└─ /api/scrape (✅ Protected)

Recommended for Future Protection:
├─ /api/links/import (if URL fetching)
├─ /api/webhooks (if accepting callback URLs)
├─ /api/proxy (if implementing)
└─ Any endpoint accepting user-provided URLs
```

---

**Architecture Version:** 1.0.0
**Last Updated:** 2025-12-09
