"""Render Oxanium into the letter masks and grey levels the Harmony 650's font table is built from.

`todo-compile-650.md` 8.2, decisions 19 and 20. The remote stores a glyph as rows of pixels, each a full
RGB565 colour or skipped. So a letter is written twice on the glyph's own cell: a one bit mask, which is
how Logitech's letters look, one ink and a drop shadow added by rule; and the grey coverage of the same
letter, sixteen levels, from which `packages/codec/src/lettering.ts` blends the letter into the flat
colour it is drawn on (8.2.6). Colours, shadows and the bytes are `lettering.ts`'s and
`packages/codec/src/fonttable.ts`'s.

Run with a Python that has Pillow, the lab's venv being the one this was written with, and the typeface
from the lab's `fonts/Oxanium/static/`:

    ../lab/work/venv/bin/python -I tools/oxanium_glyphs.py [--fonts DIR] > packages/codec/src/oxanium.ts

**The faces** are the nine Logitech draws its Harmony 650 screens in, measured over the 13 compiles in
the lab's `work/sample-8-2/` (survey.ts, metrics.py): each one's cell height, the row its baseline sits
on, whether a glyph opens with a blank column, and the width of a space. For each, the Oxanium pixel size
whose one bit capitals and x-height land on Logitech's rows. The weight was first the lightest whose
stem is Logitech's stem at that size; since 11 October 2026 it is chosen by look, Regular for the three
regular faces Logitech uses for the start up, Off, Remote Assistant, Help and tour screens, and SemiBold
for the six label faces, picked from a preview of the blended letters on the 650's own screens. They are
tunable (decision 19), and changing one is a change here and a regenerated module.

**A glyph** is the lead column if the face has one, the one bit ink from its leftmost to its rightmost
column, and one trailing column, which is where the shadow of the last ink column falls and what spaces two
letters: the remote adds nothing between glyphs (render.ts, `GLYPH_ADVANCE`). Nothing of a letter falls
above row 0 or below the cell, one bit or grey, at these sizes.

**The grey levels keep the mask's box**, so a blended letter is exactly as wide as the one bit letter and
every text is placed the same either way, which is the geometry the preview was approved in. Oxanium's
grey drawing sits on the mask's columns except in two ways. On the four faces without a lead column most
letters carry a faint edge, at most 45 percent coverage, one column left of the box, and it is left out.
And the `j` is drawn a column further right in grey than in one bit: on some faces the box then keeps only
four fifths of it, on others its stem lands in the trailing column, and either way it stands apart from
the letter before. So the grey window may slide right, to the place that keeps the most of the letter and,
of those, lies most on the one bit ink. On this typeface that moves the `j` of seven faces one column, and
nothing else; on F10 and R13 sliding it would lose some of it, and it stays.

The characters are printable ASCII, 32 to 126: every character the 13 English 650 compiles' fonts hold is in it, and a
font that holds all of them ends the composers' borrowing of letters (6.2.12).
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# name: (what Logitech draws in it, cell, baseline row, lead column, Oxanium weight, Oxanium px, space width)
FACES = {
    'F15': ('bold 15, corner labels and menu rows', 15, 11, 1, 'SemiBold', 14, 4),
    'F14W': ('bold 14 wide, corner labels', 14, 10, 1, 'SemiBold', 13, 4),
    'F14': ('bold 14, titles, counter, bottom words, corner labels', 14, 10, 0, 'SemiBold', 12, 3),
    'F13': ('bold 13, corner labels', 13, 9, 0, 'SemiBold', 11, 3),
    'F11': ('thin 11, corner labels', 11, 8, 1, 'SemiBold', 9, 3),
    'F10': ('thin 10, corner labels', 10, 7, 0, 'SemiBold', 9, 3),
    'R15': ('regular 15, firmware and status screens, Help', 15, 11, 1, 'Regular', 14, 4),
    'R14': ('regular 14, start up and Off screens, Help, the tour', 14, 10, 1, 'Regular', 12, 3),
    'R13': ('regular 13, Help', 13, 9, 0, 'Regular', 11, 3),
}
CHARACTERS = [chr(code) for code in range(32, 127)]
CANVAS = 64
BASELINE = 40


GREY_LEVELS = 15
"""The highest grey level, written as one hexadecimal digit: sixteen levels, 0 being no ink."""

WINDOW_SLIDES = (0, 1, 2)
"""How far right the grey window may move to sit on its letter, `greys` choosing."""


def render(fonts, face, ch):
    """The letter in one bit and in grey on one canvas, and the mask's box: (bits, grey, x0, x1, top)."""
    _, cell, base, lead, weight, px, space = FACES[face]
    font = ImageFont.truetype(str(fonts / f'Oxanium-{weight}.ttf'), px)
    bits = Image.new('1', (CANVAS, CANVAS), 0)
    draw = ImageDraw.Draw(bits)
    draw.fontmode = '1'
    draw.text((16, BASELINE), ch, font=font, fill=1, anchor='ls')
    grey = Image.new('L', (CANVAS, CANVAS), 0)
    ImageDraw.Draw(grey).text((16, BASELINE), ch, font=font, fill=255, anchor='ls')
    p = bits.load()
    ink = {(x, y) for y in range(CANVAS) for x in range(CANVAS) if p[x, y]}
    if not ink:
        raise SystemExit(f'{face}: {ch!r} draws nothing')
    x0 = min(x for x, _ in ink)
    x1 = max(x for x, _ in ink)
    return ink, grey.load(), x0, x1, BASELINE - 1 - base


def mask(fonts, face, ch):
    """The glyph as rows of '#' for ink and '.' for nothing, its cell high."""
    _, cell, base, lead, weight, px, space = FACES[face]
    if ch == ' ':
        return ['.' * space] * cell
    ink, _, x0, x1, top = render(fonts, face, ch)
    width = lead + (x1 - x0 + 1) + 1
    rows = [['.'] * width for _ in range(cell)]
    for x, y in ink:
        if 0 <= y - top < cell:
            rows[y - top][lead + x - x0] = '#'
    return [''.join(row) for row in rows]


def greys(fonts, face, ch):
    """The glyph's grey coverage on the mask's box, a hexadecimal level per pixel and '.' for none."""
    _, cell, base, lead, weight, px, space = FACES[face]
    if ch == ' ':
        return ['.' * space] * cell
    ink, grey, x0, x1, top = render(fonts, face, ch)
    width = lead + (x1 - x0 + 1) + 1

    def level(x, y):
        return round(grey[x, y] * GREY_LEVELS / 255)

    def held(slide):
        return sum(level(x0 - lead + slide + k, top + y) for k in range(width) for y in range(cell))

    def on_ink(slide):
        return sum(level(x + slide, y) for x, y in ink if 0 <= y - top < cell)

    slide = max(WINDOW_SLIDES, key=lambda one: (held(one), on_ink(one), -one))
    rows = []
    for y in range(cell):
        row = ''
        for k in range(width):
            level_ = level(x0 - lead + slide + k, top + y)
            row += '.' if level_ == 0 else format(level_, 'x')
        rows.append(row)
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fonts', default=str(Path(__file__).resolve().parents[2] / 'lab' / 'fonts' / 'Oxanium' / 'static'))
    fonts = Path(parser.parse_args().fonts)
    out = sys.stdout
    out.write('// Generated by tools/oxanium_glyphs.py from Oxanium, Copyright 2019 The Oxanium Project Authors\n')
    out.write('// (https://github.com/sevmeyer/oxanium), under the SIL Open Font License 1.1, which is\n')
    out.write('// packages/codec/src/oxanium-OFL.txt beside this file. Do not edit: change the tool and regenerate.\n')
    out.write('// todo-compile-650 8.2, decisions 19 and 20.\n\n')
    out.write('/** One face: what it draws, its cell, baseline row, lead column, the Oxanium cut and size, and the space. */\n')
    out.write('export interface OxaniumFace {\n  what: string;\n  cell: number;\n  baseline: number;\n  lead: number;\n')
    out.write('  weight: string;\n  px: number;\n  space: number;\n  /** Per character, rows of `#` ink and `.` nothing, `cell` rows. */\n')
    out.write('  glyphs: Readonly<Record<string, readonly string[]>>;\n')
    out.write('  /** Per character, the grey coverage on the same box: a level `1` to `f` per pixel, `.` for none. */\n')
    out.write('  greys: Readonly<Record<string, readonly string[]>>;\n}\n\n')
    out.write('export const OXANIUM_FACES = {\n')
    for face, (what, cell, base, lead, weight, px, space) in FACES.items():
        out.write(f"  {face}: {{\n    what: '{what}',\n    cell: {cell},\n    baseline: {base},\n    lead: {lead},\n")
        out.write(f"    weight: '{weight}',\n    px: {px},\n    space: {space},\n    glyphs: {{\n")
        for ch in CHARACTERS:
            key = "'\\''" if ch == "'" else ("'\\\\'" if ch == '\\' else f"'{ch}'")
            rows = ', '.join(f"'{row}'" for row in mask(fonts, face, ch))
            out.write(f'      {key}: [{rows}],\n')
        out.write('    },\n    greys: {\n')
        for ch in CHARACTERS:
            key = "'\\''" if ch == "'" else ("'\\\\'" if ch == '\\' else f"'{ch}'")
            rows = ', '.join(f"'{row}'" for row in greys(fonts, face, ch))
            out.write(f'      {key}: [{rows}],\n')
        out.write('    },\n  },\n')
    out.write('} as const satisfies Record<string, OxaniumFace>;\n\n')
    out.write('export type OxaniumFaceName = keyof typeof OXANIUM_FACES;\n')


if __name__ == '__main__':
    main()
