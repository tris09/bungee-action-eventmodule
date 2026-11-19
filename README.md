# bungee-action-eventmodule.de

Static one-pager (HTML, CSS, JS) + one small PHP file for the contact form.

```
site/            <- upload this folder's content to the web host
  index.html
  impressum.html, datenschutz.html
  kontakt.php    <- sends the contact form via mail()
  css/  js/  fonts/  img/
source-images/   <- original photos (not uploaded)
tools/
  build_images.py  <- creates responsive image sizes (AVIF + WebP) into site/img
```

Rebuild images after adding/replacing a photo in `source-images/`:

```
pip install pillow
python tools/build_images.py
```

Local preview (form sending needs PHP):

```
cd site
php -S localhost:8000      # or: python -m http.server 8000 (form won't send)
```
