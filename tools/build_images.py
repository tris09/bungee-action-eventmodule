"""
Build responsive image variants for bungee-action-eventmodule.de

For every photo in ../source-images this script writes several widths
(e.g. 400, 800, 1200, 1600 px) in two modern formats:

  site/img/<name>-<width>.avif   (smallest files, all current browsers)
  site/img/<name>-<width>.webp   (fallback for older browsers)

The HTML then uses <picture> + srcset + sizes, so every device only
downloads the size it actually needs ("responsive images").

Usage (from the project folder):
    pip install pillow
    python tools/build_images.py
"""

from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source-images"
OUT = ROOT / "site" / "img"

# Target widths. A width larger than the original is skipped (never upscale).
WIDTHS = [400, 800, 1200, 1600]

QUALITY_WEBP = 78
QUALITY_AVIF = 55  # AVIF looks good at much lower numbers than WebP/JPEG

PHOTOS = [
    "trampolin-stadion.jpg",
    "sprung-strand.jpg",
    "team-betreuer.jpg",
    "stadtfest-uebersicht.jpg",
    "huepfburg.jpg",
    # TODO: replace these two low-res placeholders (taken from the PDF)
    "piratenschiff-xxl.png",
    "kletterberg.png",
]


def build_photo(filename: str) -> None:
    src = Image.open(SRC / filename).convert("RGB")
    name = Path(filename).stem
    widths = [w for w in WIDTHS if w < src.width] + [src.width]
    for w in sorted(set(widths)):
        h = round(src.height * w / src.width)
        img = src.resize((w, h), Image.LANCZOS)
        img.save(OUT / f"{name}-{w}.webp", "WEBP", quality=QUALITY_WEBP, method=6)
        img.save(OUT / f"{name}-{w}.avif", "AVIF", quality=QUALITY_AVIF)
    print(f"{name}: {sorted(set(widths))}  ({src.width}x{src.height})")


def build_logo() -> None:
    """Original logo (white 'action') + a version with dark outline for light backgrounds."""
    logo = Image.open(SRC / "logo.png").convert("RGBA")
    logo.save(OUT / "logo.webp", "WEBP", lossless=True)

    pad = 6
    canvas = Image.new("RGBA", (logo.width + pad * 2, logo.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(logo, (pad, pad), logo)
    outline_alpha = canvas.split()[3].filter(ImageFilter.MaxFilter(7))
    stroke = Image.new("RGBA", canvas.size, (31, 31, 31, 255))
    stroke.putalpha(outline_alpha)
    Image.alpha_composite(stroke, canvas).save(OUT / "logo-outline.webp", "WEBP", lossless=True)
    print("logo: logo.webp, logo-outline.webp")


def build_social_image() -> None:
    """1200x630 preview image for WhatsApp/LinkedIn link previews (og:image)."""
    src = Image.open(SRC / "trampolin-stadion.jpg").convert("RGB")
    target_ratio = 1200 / 630
    w, h = src.size
    new_h = round(w / target_ratio)
    top = max(0, (h - new_h) // 2)
    src.crop((0, top, w, top + new_h)).resize((1200, 630), Image.LANCZOS).save(
        OUT / "og-image.jpg", "JPEG", quality=82, optimize=True
    )
    print("og-image.jpg: 1200x630")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for photo in PHOTOS:
        build_photo(photo)
    build_logo()
    build_social_image()
