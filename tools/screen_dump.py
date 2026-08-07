#!/usr/bin/env python3
"""
Disassemble the screen language programs in a config: the second interpreter, section 40.

Programs are reached from base slot 11 and from every base slot 14 lookup, and this follows every
jump and every switch arm until nothing new turns up. Instructions are variable length with no
length field, so a program that does not decode is reported rather than skipped: a silent count is
how a desynchronised walk gets mistaken for a complete one.

Usage:  screen_dump.py <file> [--json] [--all] [--images] [--strings]

Without `--all` only programs that do more than queue one action list instruction are printed,
because most of base slot 11 is exactly that and it buries everything else.

`--images` prints base slot 7 instead: the glyph sets opcode 16 selects, drawn as text. That is how
the encoding was checked in the first place, because a bitmap that decodes into readable letters is
a stronger argument than a row count.

`--strings` goes one step further and draws the inline strings themselves, each one through the
font its own program selected. A string that comes out as a readable phrase exercises the whole
chain at once: the program walk, opcode 16, the code minus one, and the bitmap decoder.
"""
import json
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile, gspm

NAMES = {
    0: 'end', 1: 'repeat', 2: 'draw', 3: 'draw.wide', 4: 'string', 5: 'string.inline',
    16: 'font', 17: 'queue', 18: 'switch', 19: 'switch.wide', 20: 'jump', 21: 'arch8',
}


def draw_string(container, font, codes):
    """One inline string, drawn through the font its program selected."""
    glyphs = [container.glyph(font, code) for code in codes]
    if any(g is None for g in glyphs):
        return None
    return draw(glyphs)


def draw(images):
    """A set of images side by side, one text line per pixel row.

    `.` is a skipped pixel, `#` a nonzero one and a space a zero one. Keeping those three apart
    matters: the format distinguishes skipped from black and a two symbol rendering hides it.
    """
    height = max(image.height for image in images)
    lines = []
    for y in range(height):
        line = []
        for image in images:
            row = image.rows[y] if y < image.height else [None] * image.width
            line.append(''.join('.' if p is None else ('#' if p else ' ') for p in row))
        lines.append(' '.join(line))
    return lines


def walk(container):
    """Every reachable program, in address order, plus the addresses that did not decode.

    The walk itself lives on the container now, because `bitmaps()` needs the same one and two
    copies of a reachability rule drift apart exactly like two opcode tables do.
    """
    return container.reachable_screen_programs()


def render(instruction):
    """One line. Switch arms are summarised rather than dumped.

    A switch can carry hundreds of arms, and printing the operand bytes of one both buries the
    program and spills the contents of somebody's config across the terminal.
    """
    name = NAMES.get(instruction.opcode, '0x%02X' % instruction.opcode)
    parts = ['%-14s' % name]
    if instruction.opcode in (gspm.SCREEN_SWITCH_NARROW, gspm.SCREEN_SWITCH_WIDE):
        parts.append('state variable %d, %d arms' % (instruction.operands[0],
                                                     len(instruction.targets)))
        return '  '.join(parts)
    if instruction.glyphs is not None:
        parts.append('%d glyphs' % len(instruction.glyphs))
    elif instruction.operands:
        parts.append(instruction.operands.hex(' '))
    if instruction.targets:
        parts.append('-> ' + ' '.join('0x%06X' % t for t in instruction.targets))
    return '  '.join(parts)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    as_json = '--json' in sys.argv[2:]
    show_all = '--all' in sys.argv[2:]

    try:
        data = ezfile.decode_payload(ezfile.load_image(path)).payload
    except Exception:
        data = open(path, 'rb').read()
    container = gspm.parse(data)
    programs, failed = walk(container)

    if as_json:
        json.dump({
            'architecture': container.architecture,
            'failed': ['0x%06X' % a for a in failed],
            'programs': [{
                'address': address,
                'instructions': [{
                    'opcode': i.opcode,
                    'name': NAMES.get(i.opcode),
                    'operands': i.operands.hex(),
                    'glyphs': None if i.glyphs is None else i.glyphs.hex(),
                    'targets': i.targets,
                } for i in program],
            } for address, program in sorted(programs.items())],
        }, sys.stdout, indent=2)
        print()
        return

    if '--strings' in sys.argv:
        fonts = container.font_sets()
        if fonts is None or container.architecture not in gspm.IMAGE_ARCHITECTURES:
            print('no glyphs: architecture %s uses a packing this reader does not decode'
                  % container.architecture)
            return
        drawn = 0
        for address, program in sorted(programs.items()):
            selected = None
            for instruction in program:
                # Opcode 16 sets the current font and it stays set for the rest of the program,
                # so a string is drawn with whatever the last one named.
                if instruction.opcode == gspm.SCREEN_SELECT_FONT and instruction.operands:
                    selected = instruction.operands[0]
                if instruction.opcode != gspm.SCREEN_TEXT_INLINE or not instruction.glyphs:
                    continue
                if selected is None or selected >= len(fonts):
                    continue
                lines = draw_string(container, fonts[selected], instruction.glyphs)
                if lines is None:
                    continue
                drawn += 1
                print('\n0x%06X, font %d, codes %s'
                      % (address, selected, list(instruction.glyphs)))
                for line in lines:
                    print('    ' + line)
        print('\n%d strings drawn' % drawn)
        return

    if '--images' in sys.argv:
        sets = container.images()
        if sets is None:
            print('no images: architecture %s uses a packing this reader does not decode'
                  % container.architecture)
            return
        print('architecture %s, %d sets, %d images'
              % (container.architecture, len(sets), sum(len(s) for s in sets)))
        for index, images in enumerate(sets):
            print('\nset %d, %d images' % (index, len(images)))
            if not images:
                continue
            for line in draw(images):
                print('    ' + line)
        return

    trivial = sum(1 for p in programs.values()
                  if [i.opcode for i in p] == [gspm.SCREEN_QUEUE_INSTRUCTION, gspm.SCREEN_END])
    print('architecture %s, %d programs, %d of them a single queued instruction, %d undecodable'
          % (container.architecture, len(programs), trivial, len(failed)))
    for address in failed:
        print('  0x%06X did not decode' % address)
    for address, program in sorted(programs.items()):
        if not show_all and [i.opcode for i in program] == [gspm.SCREEN_QUEUE_INSTRUCTION,
                                                            gspm.SCREEN_END]:
            continue
        print('\n0x%06X' % address)
        for instruction in program:
            print('    ' + render(instruction))


main()
