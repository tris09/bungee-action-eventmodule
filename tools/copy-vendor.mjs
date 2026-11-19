/**
 * Copies browser libraries from node_modules into site/js/vendor,
 * so the live site serves them itself (no CDN, no third-party requests).
 *
 * Run after `npm install` or an update:  npm run vendor
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'site', 'js', 'vendor');

const files = [
  // ALTCHA widget incl. translations (DE/EN/FR/NL are picked at runtime)
  ['node_modules/altcha/dist/main/altcha.i18n.min.js', 'altcha.min.js'],
  ['node_modules/altcha/LICENSE.txt', 'altcha.LICENSE.txt'],
];

await mkdir(target, { recursive: true });
for (const [from, to] of files) {
  await copyFile(join(root, from), join(target, to));
  console.log(`✓ ${from} → site/js/vendor/${to}`);
}
