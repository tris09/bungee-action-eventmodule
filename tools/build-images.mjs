/**
 * Responsive image builder for bungee-action-eventmodule.de
 *
 * Takes every photo in /source-images and writes resized copies into
 * /site/img using the naming convention:
 *
 *     <slug>-<width>.avif
 *     <slug>-<width>.webp
 *
 *   e.g. "Hüpfburg Stadtfest 2026.JPG" -> huepfburg-stadtfest-2026-400.avif, ...-800.webp
 *
 * Usage (from the project folder):
 *     npm install            (once)
 *     npm run images         build new / changed photos only
 *     npm run images:force   rebuild everything
 *     npm run images:clean   also delete variants whose source photo was removed
 *
 * After each run, tools/picture-snippets.html contains a ready-to-copy
 * <picture> block for every image.
 */

import { readdir, stat, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// ---------- Configuration ----------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'source-images');
const OUT_DIR = path.join(ROOT, 'site', 'img');
const SNIPPET_FILE = path.join(ROOT, 'tools', 'picture-snippets.html');

const WIDTHS = [400, 800, 1200, 1600];     // target widths in px, never upscaled
const FORMATS = {
  avif: { quality: 50, effort: 4 },        // smallest files
  webp: { quality: 78, effort: 5 },        // fallback for older browsers
};
const INPUT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif'];

// Photo used for link previews (WhatsApp, LinkedIn): 1200x630 JPEG
const OG_SOURCE_SLUG = 'trampolin-stadion';

// ---------- CLI flags ----------
const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const CLEAN = args.has('--clean');

// ---------- Helpers ----------

/** "Hüpfburg Stadtfest 2026.JPG" -> "huepfburg-stadtfest-2026" */
function toSlug(filename) {
  return path.parse(filename).name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // remove other accents (é -> e)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Widths to generate for an image of the given original width. */
function targetWidths(originalWidth) {
  const widths = WIDTHS.filter((w) => w < originalWidth);
  // Add the original width as largest size, unless it is bigger than our maximum
  widths.push(Math.min(originalWidth, WIDTHS[WIDTHS.length - 1]));
  return [...new Set(widths)].sort((a, b) => a - b);
}

async function mtime(file) {
  try { return (await stat(file)).mtimeMs; } catch { return 0; }
}

/** True if every output file exists and is newer than the source. */
async function isUpToDate(srcFile, outFiles) {
  const srcTime = await mtime(srcFile);
  for (const f of outFiles) {
    if ((await mtime(f)) < srcTime) return false;
  }
  return true;
}

function pictureSnippet(slug, widths, width, height) {
  const set = (ext) => widths.map((w) => `img/${slug}-${w}.${ext} ${w}w`).join(', ');
  const fallback = widths.includes(800) ? 800 : widths[widths.length - 1];
  return `<!-- ${slug} (${width}x${height}) – adjust "sizes" to the real display width -->
<picture>
  <source type="image/avif" srcset="${set('avif')}" sizes="100vw">
  <img src="img/${slug}-${fallback}.webp"
       srcset="${set('webp')}"
       sizes="100vw"
       width="${width}" height="${height}"
       loading="lazy" decoding="async"
       alt="TODO: describe the image">
</picture>`;
}

// ---------- Main ----------
async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const sources = (await readdir(SRC_DIR))
    .filter((f) => INPUT_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();

  if (sources.length === 0) {
    console.log(`No images found in ${SRC_DIR}`);
    return;
  }

  const slugs = new Map(); // slug -> source filename (detect name clashes)
  const snippets = [];
  let built = 0;
  let skipped = 0;

  for (const file of sources) {
    const slug = toSlug(file);
    if (slugs.has(slug)) {
      console.warn(`! Skipping "${file}": same name as "${slugs.get(slug)}" after renaming (${slug})`);
      continue;
    }
    slugs.set(slug, file);

    const srcPath = path.join(SRC_DIR, file);
    // .rotate() applies the EXIF orientation of phone photos
    const meta = await sharp(srcPath).rotate().metadata();
    const portrait = meta.orientation >= 5; // EXIF 5–8 = rotated 90°
    const width = portrait ? meta.height : meta.width;
    const height = portrait ? meta.width : meta.height;
    const widths = targetWidths(width);

    snippets.push(pictureSnippet(slug, widths, width, height));

    const outFiles = widths.flatMap((w) =>
      Object.keys(FORMATS).map((ext) => path.join(OUT_DIR, `${slug}-${w}.${ext}`)));

    if (!FORCE && (await isUpToDate(srcPath, outFiles))) {
      skipped++;
      continue;
    }

    for (const w of widths) {
      const resized = sharp(srcPath).rotate().resize({ width: w, withoutEnlargement: true });
      for (const [ext, options] of Object.entries(FORMATS)) {
        await resized.clone().toFormat(ext, options).toFile(path.join(OUT_DIR, `${slug}-${w}.${ext}`));
      }
    }
    built++;
    console.log(`✓ ${file} -> ${slug} [${widths.join(', ')}]`);

    if (slug === OG_SOURCE_SLUG) {
      await sharp(srcPath).rotate()
        .resize(1200, 630, { fit: 'cover' })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(OUT_DIR, 'og-image.jpg'));
      console.log('  + og-image.jpg (1200x630)');
    }
  }

  // Remove variants of photos that no longer exist in source-images
  if (CLEAN) {
    const variant = /^(.+)-(\d+)\.(avif|webp)$/;
    for (const f of await readdir(OUT_DIR)) {
      const match = f.match(variant);
      if (match && !slugs.has(match[1])) {
        await unlink(path.join(OUT_DIR, f));
        console.log(`- removed ${f}`);
      }
    }
  }

  await writeFile(SNIPPET_FILE, snippets.join('\n\n') + '\n', 'utf8');
  console.log(`\nDone: ${built} built, ${skipped} unchanged. Snippets: tools/picture-snippets.html`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
