import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const iconsDir = join(publicDir, 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Read SVG file
const svgPath = join(publicDir, 'logo.svg');
const svgBuffer = readFileSync(svgPath);

async function generateIcons() {
  console.log('Generating PWA icons from logo.svg...\n');

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 1 } // #0a0a0a
      })
      .png()
      .toFile(outputPath);

    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Also create apple-touch-icon
  const appleTouchIconPath = join(publicDir, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .png()
    .toFile(appleTouchIconPath);
  console.log('  Created: apple-touch-icon.png');

  // Create favicon.ico (16x16 and 32x32)
  const favicon32Path = join(publicDir, 'favicon-32x32.png');
  const favicon16Path = join(publicDir, 'favicon-16x16.png');

  await sharp(svgBuffer)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .png()
    .toFile(favicon32Path);
  console.log('  Created: favicon-32x32.png');

  await sharp(svgBuffer)
    .resize(16, 16, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .png()
    .toFile(favicon16Path);
  console.log('  Created: favicon-16x16.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
