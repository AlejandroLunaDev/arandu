"""Tesseract's reading of a PDF's pages, as text, to confirm another reading of the same pages.

Needs the tesseract binary (TESSERACT, else on PATH) and Portuguese and orientation data (por and osd traineddata
under TESSDATA_PREFIX).
"""

import io
import os
import re
import subprocess
import unicodedata

import pypdfium2
from PIL import Image, ImageDraw

DPIS = (300, 400, 500)  # each resolution reads some words the others miss
MODES = ("11", "6", "4")  # sparse text, one block, one column: the same page read by three layouts
SLIPS = str.maketrans("l1", "ii")  # OCR reads a roman numeral's I as l or 1


def render(data, dpi):
    """Each page of the PDF bytes as a grayscale image."""
    return [page.render(scale=dpi / 72, grayscale=True).to_pil().convert("L") for page in pypdfium2.PdfDocument(data)]


def key(text):
    """Text compared without case, accents, spaces or punctuation; 'rn' reads as 'm', the commonest OCR slip."""
    text = unicodedata.normalize("NFKD", text.casefold())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in text if not unicodedata.combining(c))).replace("rn", "m")


def tokens(text):
    """The text's words, keyed, each between bars ('|calculo|1|'): a name is then matched word by word, in order.

    A word hyphenated at a line break keeps its hyphen ('|algorit-|'), so its tail may be looked for further on.
    """
    words = ((key(word), word.endswith("-")) for word in text.split())
    return "|" + "".join(f"{word}{'-' if broken else ''}|" for word, broken in words if word)


def _tesseract(image, *args):
    png = io.BytesIO()
    image.save(png, "PNG")
    return subprocess.run([os.environ.get("TESSERACT", "tesseract"), "stdin", "stdout", *args],
                          input=png.getvalue(), capture_output=True)


def _upright(image):
    """The page turned the way Tesseract's orientation detection says its text runs (a matriz may be scanned sideways)."""
    rotate = re.search(rb"Rotate: (\d+)", _tesseract(image, "--psm", "0", "-l", "osd").stdout)
    return image.rotate(-int(rotate[1]), expand=True) if rotate and rotate[1] != b"0" else image.copy()


def _rules(image, horizontal, step=8, min_len=120):
    """Dark straight runs at least min_len pixels long: (position, start, end) of each table rule."""
    width, height = image.size
    small = image.resize((width // step, height) if horizontal else (width, height // step), Image.BOX)
    pixels, (w, h) = small.load(), small.size
    runs = []
    for a in range(h if horizontal else w):
        start, length = None, w if horizontal else h
        for b in range(length + 1):
            dark = b < length and (pixels[b, a] if horizontal else pixels[a, b]) < 80
            if dark and start is None:
                start = b
            elif not dark and start is not None:
                if (b - start) * step >= min_len:
                    runs.append((a, start * step, b * step))
                start = None
    return runs


def texts(image):
    """The words Tesseract reads on a page in each layout mode, as tokens(), its rules erased so cells read clean."""
    image = _upright(image)
    draw = ImageDraw.Draw(image)
    for y, start, end in _rules(image, True):
        draw.rectangle([start - 2, y - 3, end + 2, y + 3], fill=255)
    for x, start, end in _rules(image, False, min_len=60):
        draw.rectangle([x - 3, start - 2, x + 3, end + 2], fill=255)
    found = []
    for mode in MODES:
        read = _tesseract(image, "-l", "por", "--psm", mode)
        if read.returncode:
            raise RuntimeError(f"tesseract failed: {read.stderr.decode('utf-8', 'replace')[:200]}")
        found.append(tokens(read.stdout.decode("utf-8")).translate(SLIPS))
    return found
