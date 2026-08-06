#!/usr/bin/env python3
"""
Disassemble the screen language programs in a config: the second interpreter, section 40.

Programs are reached from base slot 11 and from every base slot 14 lookup, and this follows every
jump and every switch arm until nothing new turns up. Instructions are variable length with no
length field, so a program that does not decode is reported rather than skipped: a silent count is
how a desynchronised walk gets mistaken for a complete one.

Usage:  screen_dump.py <file> [--json] [--all]

Without `--all` only programs that do more than queue one action list instruction are printed,
because most of base slot 11 is exactly that and it buries everything else.
"""
import json
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile, gspm

NAMES = {
    0: 'end', 1: 'repeat', 2: 'draw', 3: 'draw.wide', 4: 'string', 5: 'string.inline',
    16: 'slot7', 17: 'queue', 18: 'switch', 19: 'switch.wide', 20: 'jump', 21: 'arch8',
}


def walk(container):
    """Every reachable program, in address order, plus the addresses that did not decode."""
    seen, queue, failed = set(), list(container.screen_program_roots()), []
    programs = {}
    while queue:
        address = queue.pop()
        if address in seen:
            continue
        seen.add(address)
        program = container.screen_program(address)
        if program is None:
            failed.append(address)
            continue
        programs[address] = program
        for instruction in program:
            queue += [t for t in instruction.targets if t not in seen]
    return programs, failed


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
