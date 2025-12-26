# Security Module - SSRF Protection

## Overview

This module provides comprehensive Server-Side Request Forgery (SSRF) protection for the Stacklume application. SSRF vulnerabilities occur when an application fetches remote resources without properly validating user-supplied URLs, potentially allowing attackers to access internal systems.

## What is SSRF?

Server-Side Request Forgery (SSRF) is a security vulnerability that allows attackers to make the server perform requests to unintended locations. This can lead to:

- **Access to internal services**: Reading cloud metadata, internal APIs, or admin panels
- **Port scanning**: Discovering internal network topology
- **Data exfiltration**: Reading sensitive files or configurations
- **Credential theft**: Accessing cloud provider credentials (AWS, GCP, Azure)

## Implementation

### Files

- **`ssrf-protection.ts`**: Core SSRF validation logic
- **`ssrf-protection.test.ts`**: Comprehensive test suite
- **`README.md`**: This documentation

### Protected Resources

The SSRF protection blocks access to:

1. **Loopback addresses**
   - `127.0.0.0/8` (127.x.x.x)
   - `localhost`
   - `::1` (IPv6 loopback)

2. **Private network ranges (RFC 1918)**
   - `10.0.0.0/8` (10.x.x.x)
   - `172.16.0.0/12` (172.16-31.x.x)
   - `192.168.0.0/16` (192.168.x.x)

3. **Link-local addresses**
   - `169.254.0.0/16` (includes AWS/GCP/Azure metadata services)
   - `fe80::/10` (IPv6 link-local)

4. **Cloud metadata endpoints**
   - `169.254.169.254` (AWS EC2 metadata)
   - `169.254.170.2` (AWS ECS metadata)
   - `metadata.google.internal` (GCP metadata)

5. **Internal domains**
   - `.local` domains (mDNS)
   - `.internal` domains

6. **Dangerous protocols**
   - `file://` (local file access)
   - `ftp://`, `gopher://`, `dict://`
   - `data://`, `php://`, `expect://`

## Usage

### In API Routes

```typescript
import { validateUrlForSSRF } from '@/lib/security/ssrf-protection';

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
  const validUrl = validation.validUrl!;

  // Proceed with safe URL...
  const response = await fetch(validUrl.toString());
}
```

### Synchronous Validation

For quick checks without DNS resolution:

```typescript
import { validateUrlForSSRFSync } from '@/lib/security/ssrf-protection';

const validation = validateUrlForSSRFSync(userProvidedUrl);

if (!validation.safe) {
  console.error(`Blocked: ${validation.reason}`);
}
```

### Simple Boolean Check

```typescript
import { isUrlSafe } from '@/lib/security/ssrf-protection';

if (await isUrlSafe(url)) {
  // Safe to proceed
}
```

## API Reference

### `validateUrlForSSRF(url: string)`

**Returns:** `Promise<{ safe: boolean; reason?: string; validUrl?: URL }>`

Performs comprehensive SSRF validation including:
1. URL format validation
2. Protocol checking (only HTTP/HTTPS allowed)
3. Hostname validation
4. DNS resolution to check for private IPs

**Example:**
```typescript
const result = await validateUrlForSSRF('https://example.com');
// { safe: true, validUrl: URL {...} }

const blocked = await validateUrlForSSRF('http://localhost');
// { safe: false, reason: 'Internal or reserved hostname not allowed' }
```

### `validateUrlForSSRFSync(url: string)`

**Returns:** `{ safe: boolean; reason?: string; validUrl?: URL }`

Synchronous validation without DNS resolution. Faster but less comprehensive.

**Use when:** You need immediate validation and can't await async operations.

### `isUrlSafe(url: string)`

**Returns:** `Promise<boolean>`

Convenience function that returns only a boolean result.

## Protected Endpoints

Currently protected endpoints:
- **`/api/scrape`**: URL metadata scraping endpoint

## Security Best Practices

1. **Always validate before fetching**: Never fetch user-provided URLs without validation
2. **Use allowlists when possible**: If you only need specific domains, use an allowlist
3. **Log blocked attempts**: Monitor for potential attack patterns
4. **Keep up to date**: Update IP ranges as cloud providers add new metadata endpoints
5. **Defense in depth**: Combine with network-level protections (firewalls, network policies)

## Testing

Run the test suite:

```bash
npm test src/lib/security/ssrf-protection.test.ts
```

### Test Coverage

The test suite covers:
- Valid public URLs (should pass)
- Private IP ranges (should block)
- Cloud metadata endpoints (should block)
- Protocol validation (should block non-HTTP/HTTPS)
- Internal hostnames (should block)
- DNS rebinding scenarios
- Edge cases (ports, paths, query parameters)
- Real-world attack scenarios

## Attack Scenarios Prevented

### 1. AWS Metadata Service Access
```
❌ http://169.254.169.254/latest/meta-data/iam/security-credentials/
```
Blocked: Prevents stealing AWS credentials

### 2. Internal Service Scanning
```
❌ http://192.168.1.100:8080/admin
```
Blocked: Prevents accessing internal admin panels

### 3. Local File Access
```
❌ file:///etc/passwd
```
Blocked: Prevents reading local files

### 4. Docker API Access
```
❌ http://172.17.0.1:2375/containers/json
```
Blocked: Prevents Docker container manipulation

### 5. DNS Rebinding
```
❌ http://attacker-domain.com (resolves to 127.0.0.1)
```
Blocked: DNS resolution detects private IP

## Limitations

1. **Time-of-check/time-of-use**: DNS records can change between validation and fetch
   - **Mitigation**: Validation happens immediately before fetch

2. **IPv6 coverage**: Some IPv6 private ranges may need additional patterns
   - **Mitigation**: Regularly update IP range patterns

3. **Performance**: DNS resolution adds latency (~10-100ms per validation)
   - **Mitigation**: Use `validateUrlForSSRFSync` when appropriate

## Future Enhancements

- [ ] URL allowlist configuration for known-safe domains
- [ ] Rate limiting for validation attempts
- [ ] Caching of DNS resolutions (with short TTL)
- [ ] Integration with WAF/security monitoring
- [ ] Additional cloud provider metadata endpoints
- [ ] Support for CIDR notation in configuration

## References

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [PortSwigger SSRF](https://portswigger.net/web-security/ssrf)
- [CWE-918: Server-Side Request Forgery](https://cwe.mitre.org/data/definitions/918.html)
- [AWS EC2 Instance Metadata Service](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)

## Contributing

When adding new validation rules:

1. Add the IP range or pattern to the appropriate constant
2. Write tests for the new scenario
3. Update this documentation
4. Verify all existing tests still pass

## License

This security module is part of the Stacklume project.
