/**
 * Manual test script for SSRF protection
 * Run with: node src/lib/security/test-ssrf.mjs
 */

import { validateUrlForSSRF, validateUrlForSSRFSync } from './ssrf-protection.js';

console.log('🔒 SSRF Protection Manual Tests\n');

// Test cases
const testCases = [
  // Should PASS
  { url: 'https://example.com', shouldPass: true },
  { url: 'https://github.com/user/repo', shouldPass: true },
  { url: 'https://www.youtube.com/watch?v=test', shouldPass: true },
  { url: 'http://google.com', shouldPass: true },

  // Should BLOCK - Private IPs
  { url: 'http://localhost:3000', shouldPass: false },
  { url: 'http://127.0.0.1', shouldPass: false },
  { url: 'http://10.0.0.1', shouldPass: false },
  { url: 'http://192.168.1.1', shouldPass: false },
  { url: 'http://172.16.0.1', shouldPass: false },

  // Should BLOCK - Cloud metadata
  { url: 'http://169.254.169.254/latest/meta-data/', shouldPass: false },
  { url: 'http://metadata.google.internal', shouldPass: false },

  // Should BLOCK - Bad protocols
  { url: 'file:///etc/passwd', shouldPass: false },
  { url: 'ftp://internal.server/file', shouldPass: false },

  // Should BLOCK - Internal domains
  { url: 'http://server.local', shouldPass: false },
];

console.log('Testing validateUrlForSSRFSync (synchronous):\n');

testCases.forEach(({ url, shouldPass }) => {
  const result = validateUrlForSSRFSync(url);
  const passed = result.safe === shouldPass;
  const icon = passed ? '✅' : '❌';

  console.log(`${icon} ${url}`);
  console.log(`   Expected: ${shouldPass ? 'PASS' : 'BLOCK'}, Got: ${result.safe ? 'PASS' : 'BLOCK'}`);
  if (!result.safe) {
    console.log(`   Reason: ${result.reason}`);
  }
  console.log('');
});

console.log('\n' + '='.repeat(80) + '\n');
console.log('Testing validateUrlForSSRF (async with DNS resolution):\n');

// Test async validation
async function testAsync() {
  for (const { url, shouldPass } of testCases) {
    const result = await validateUrlForSSRF(url);
    const passed = result.safe === shouldPass;
    const icon = passed ? '✅' : '❌';

    console.log(`${icon} ${url}`);
    console.log(`   Expected: ${shouldPass ? 'PASS' : 'BLOCK'}, Got: ${result.safe ? 'PASS' : 'BLOCK'}`);
    if (!result.safe) {
      console.log(`   Reason: ${result.reason}`);
    }
    console.log('');
  }

  console.log('\n' + '='.repeat(80) + '\n');
  console.log('✨ All tests completed!\n');
}

testAsync().catch(console.error);
