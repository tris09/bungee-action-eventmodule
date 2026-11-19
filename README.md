# bungee-action-eventmodule.de

Static one-pager (HTML, CSS, JS) + one small PHP file for the contact form.

```
site/              <- upload this folder's content to the web host
  index.html, impressum.html, datenschutz.html
  kontakt.php      <- sends the contact form via mail()
  css/ js/ fonts/ img/
source-images/     <- original photos (not uploaded)
brand/             <- original logo file
tools/
  build-images.mjs       <- responsive image builder (sharp)
  picture-snippets.html  <- generated <picture> markup per image
```

## Responsive images

Put a photo into `source-images/`, then:

```
npm install            # once
npm run images         # build new / changed photos
npm run images:force   # rebuild all
npm run images:clean   # also delete variants of removed photos
```

Output: `site/img/<slug>-<width>.avif|webp` (widths 400/800/1200/1600, never upscaled).

## Local preview

```
cd site
php -S localhost:8000
```
