/**
 * SSRF (Server-Side Request Forgery) Protection
 *
 * This module provides utilities to prevent SSRF attacks by validating URLs
 * and blocking requests to private IP ranges, internal hostnames, and sensitive
 * cloud metadata endpoints.
 */

import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

/**
 * Private IP ranges that should be blocked
 */
const PRIVATE_IP_RANGES = [
  // Loopback addresses
  /^127\./,                    // 127.0.0.0/8
  /^localhost$/i,              // localhost

  // Private network ranges (RFC 1918)
  /^10\./,                     // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,               // 192.168.0.0/16

  // Link-local addresses
  /^169\.254\./,               // 169.254.0.0/16 (AWS metadata service)
  /^fe80:/i,                   // fe80::/10 (IPv6 link-local)

  // Broadcast and multicast
  /^224\./,                    // 224.0.0.0/4 (Multicast)
  /^255\.255\.255\.255$/,      // Broadcast

  // IPv6 loopback and private
  /^::1$/,                     // IPv6 loopback
  /^fc00:/i,                   // fc00::/7 (IPv6 private)
  /^fd00:/i,                   // fd00::/8 (IPv6 private)

  // Reserved ranges
  /^0\./,                      // 0.0.0.0/8
  /^192\.0\.2\./,              // 192.0.2.0/24 (TEST-NET-1)
  /^198\.51\.100\./,           // 198.51.100.0/24 (TEST-NET-2)
  /^203\.0\.113\./,            // 203.0.113.0/24 (TEST-NET-3)
];

/**
 * Cloud metadata endpoints that must be blocked
 */
const CLOUD_METADATA_IPS = [
  '169.254.169.254',  // AWS, Azure, GCP metadata service
  '169.254.170.2',    // AWS ECS metadata
  'fd00:ec2::254',    // AWS IMDSv2 IPv6
];

/**
 * Dangerous URL protocols that should be blocked
 */
const DANGEROUS_PROTOCOLS = [
  'file:',
  'ftp:',
  'gopher:',
  'data:',
  'dict:',
  'php:',
  'expect:',
  'jar:',
];

/**
 * Internal hostnames that should be blocked
 */
const INTERNAL_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',  // GCP metadata
  '169.254.169.254',            // Cloud metadata IP
];

/**
 * Check if an IP address is private or reserved
 */
function isPrivateIP(ip: string): boolean {
  // Check against all private IP ranges
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(ip)) {
      return true;
    }
  }

  // Check against cloud metadata IPs
  if (CLOUD_METADATA_IPS.includes(ip)) {
    return true;
  }

  return false;
}

/**
 * Check if a hostname is internal or dangerous
 */
function isInternalHostname(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  // Check against known internal hostnames
  for (const internal of INTERNAL_HOSTNAMES) {
    if (lowerHostname === internal.toLowerCase()) {
      return true;
    }
  }

  // Check for .local domains (mDNS)
  if (lowerHostname.endsWith('.local')) {
    return true;
  }

  // Check for .internal domains
  if (lowerHostname.endsWith('.internal')) {
    return true;
  }

  return false;
}

/**
 * Validate URL protocol
 */
function hasValidProtocol(url: URL): boolean {
  const protocol = url.protocol.toLowerCase();

  // Only allow HTTP and HTTPS
  if (protocol !== 'http:' && protocol !== 'https:') {
    return false;
  }

  // Check against dangerous protocols
  for (const dangerous of DANGEROUS_PROTOCOLS) {
    if (protocol === dangerous.toLowerCase()) {
      return false;
    }
  }

  return true;
}

/**
 * Resolve hostname to IP and check if it's private
 * This is the main defense against DNS rebinding attacks
 */
async function resolveAndCheckIP(hostname: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    // First check if hostname itself is suspicious
    if (isInternalHostname(hostname)) {
      return { safe: false, reason: 'Internal or reserved hostname not allowed' };
    }

    // Check if hostname is already an IP address
    if (isPrivateIP(hostname)) {
      return { safe: false, reason: 'Private or reserved IP address not allowed' };
    }

    // Resolve hostname to IP address
    const { address } = await dnsLookup(hostname);

    // Check if resolved IP is private
    if (isPrivateIP(address)) {
      return { safe: false, reason: `Hostname resolves to private IP: ${address}` };
    }

    return { safe: true };
  } catch (_error) {
    // DNS resolution failed
    return { safe: false, reason: 'Failed to resolve hostname' };
  }
}

/**
 * Main validation function to check if a URL is safe from SSRF attacks
 *
 * @param url - The URL string to validate
 * @returns Object with { safe: boolean, reason?: string, validUrl?: URL }
 */
export async function validateUrlForSSRF(url: string): Promise<{
  safe: boolean;
  reason?: string;
  validUrl?: URL;
}> {
  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Check protocol
  if (!hasValidProtocol(parsedUrl)) {
    return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
  }

  // Check hostname/IP
  const hostname = parsedUrl.hostname.toLowerCase();

  // Resolve and check IP
  const ipCheck = await resolveAndCheckIP(hostname);
  if (!ipCheck.safe) {
    return { safe: false, reason: ipCheck.reason };
  }

  return { safe: true, validUrl: parsedUrl };
}

/**
 * Synchronous version of URL validation (without DNS resolution)
 * Use this for quick protocol and hostname checks, but prefer validateUrlForSSRF for full protection
 */
export function validateUrlForSSRFSync(url: string): {
  safe: boolean;
  reason?: string;
  validUrl?: URL;
} {
  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Check protocol
  if (!hasValidProtocol(parsedUrl)) {
    return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
  }

  // Check hostname
  const hostname = parsedUrl.hostname.toLowerCase();

  if (isInternalHostname(hostname)) {
    return { safe: false, reason: 'Internal or reserved hostname not allowed' };
  }

  if (isPrivateIP(hostname)) {
    return { safe: false, reason: 'Private or reserved IP address not allowed' };
  }

  return { safe: true, validUrl: parsedUrl };
}

/**
 * Convenience function for checking if a URL is safe (returns boolean only)
 */
export async function isUrlSafe(url: string): Promise<boolean> {
  const result = await validateUrlForSSRF(url);
  return result.safe;
}
