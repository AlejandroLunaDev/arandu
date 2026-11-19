"""Tesseract's reading of a PDF's pages, as the words it saw, to confirm another reading word by word.

Needs the tesseract binary (TESSERACT, else on PATH) and Portuguese data (por.traineddata under TESSDATA_PREFIX).
"""

import os
import re
import subprocess
import unicodedata
import io

import pypdfium2
from PIL import Image, ImageDraw

DPIS = (300, 400, 500)  # each resolution reads some words the others miss
MODES = ("11", "6", "4")  # sparse text, one block, one column: the same, read by three page layouts


def render(data, dpi):
    """Each page of the PDF bytes as a grayscale image."""
    return [page.render(scale=dpi / 72, grayscale=True).to_pil().convert("L") for page in pypdfium2.PdfDocument(data)]


def key(word):
    """A word compared without case, accents or punctuation; 'rn' reads as 'm', the commonest OCR slip."""
    word = unicodedata.normalize("NFKD", word.casefold())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in word if not unicodedata.combining(c))).replace("rn", "m")


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


def _upright(image):
    """The page turned the way Tesseract's orientation detection says its text runs (a matriz may be scanned sideways)."""
    png = io.BytesIO()
    image.save(png, "PNG")
    found = subprocess.run([os.environ.get("TESSERACT", "tesseract"), "stdin", "stdout", "--psm", "0", "-l", "osd"],
                           input=png.getvalue(), capture_output=True)  # a page with too little text fails: keep it as is
    rotate = re.search(rb"Rotate: (\d+)", found.stdout)
    return image.rotate(-int(rotate[1]), expand=True) if rotate and rotate[1] != b"0" else image.copy()


def words(image):
    """The keys of every word Tesseract reads on a page, its rules erased first so cells read without borders."""
    image = _upright(image)
    draw = ImageDraw.Draw(image)
    for y, start, end in _rules(image, True):
        draw.rectangle([start - 2, y - 3, end + 2, y + 3], fill=255)
    for x, start, end in _rules(image, False, min_len=60):
        draw.rectangle([x - 3, start - 2, x + 3, end + 2], fill=255)
    png = io.BytesIO()
    image.save(png, "PNG")
    found = set()
    for mode in MODES:
        text = subprocess.run([os.environ.get("TESSERACT", "tesseract"), "stdin", "stdout", "-l", "por", "--psm", mode],
                              input=png.getvalue(), capture_output=True, check=True).stdout.decode("utf-8").split()
        found |= {key(w) for w in text}
        found |= {key(a + b) for a, b in zip(text, text[1:])}  # a word split in two ('Inform acionais')
        # A word hyphenated at a line break: its tail starts the next line, read after the cells beside it.
        found |= {key(a[:-1] + b) for a in text if a.endswith("-") for b in text}
    return found - {""}


def confirmed(word, seen):
    """The key word is among the keys seen, or one character off once it is long enough not to match another."""
    if word in seen:
        return True
    # shortcut: OCR reads a roman numeral's I as l, 1 or |, so 'II' is confirmed by any two such marks; check a
    # matriz by eye if it numbers units both ways.
    if re.fullmatch(r"i+", word):
        return any(re.fullmatch(rf"[il1]{{{len(word)}}}", w) for w in seen)
    return len(word) >= 6 and any(abs(len(w) - len(word)) <= 1 and _distance(w, word) <= 1 for w in seen)


def _distance(a, b):
    row = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        previous, row[0] = row[0], i
        for j, cb in enumerate(b, 1):
            previous, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, previous + (ca != cb))
    return row[-1]
