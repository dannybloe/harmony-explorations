"""What the unreached region of a config holds.

`docs/findings.md` sections 49, 50 and 51. Most of a config sits above the highest byte any named
section reaches, and nothing found so far addresses it. This module does not decode it, because
there is no framing to decode: it measures the two properties that identify the bytes as pixels,
so a claim about them is executable rather than an impression.

**Reverse engineering only, and deliberately not in `packages/codec`.** The TypeScript side owns
readers, which turn bytes into structures a writer could reproduce. A row width recovered by
minimising a difference is a measurement, not a reader, and putting it beside the readers would
invite a caller to treat it as one.
"""
from typing import Dict, List, Optional, Sequence, Tuple

# Established on arch 12, from both Harmony Ones. See `best_row_width` for how, and
# `blank_screen_runs` for the closure that fixes the height as well.
PIXEL_BYTES = 2
SCREEN_SIZE: Dict[int, Tuple[int, int]] = {12: (176, 220)}
# Search bounds for the width recovery. 512 is past any panel these remotes carry.
WIDTH_RANGE = (8, 512)


def pixels(data: bytes, offset: int, count: int) -> List[int]:
    """`count` sixteen bit pixels from `offset`, big endian.

    Big endian is not a convention chosen here. Read that way the Harmony 600's region resolves to
    RGB565 greys far above chance and its long runs read as monotone gradients; read little endian
    neither holds. `docs/findings.md` section 51.
    """
    return [int.from_bytes(data[offset + 2 * i:offset + 2 * i + 2], 'big') for i in range(count)]


def row_score(px: Sequence[int], width: int, sample: int = 7) -> Optional[float]:
    """Mean absolute difference between vertically adjacent pixels at a candidate row width.

    The measure an image minimises and noise does not: neighbouring rows of a picture are similar
    and neighbouring rows of anything else are not. `sample` thins the columns, which changes the
    absolute number and not which width wins.
    """
    rows = len(px) // width
    if rows < 12:
        return None
    columns = range(0, width, sample)
    total = sum(abs(px[r * width + x] - px[(r + 1) * width + x])
                for r in range(rows - 1) for x in columns)
    return total / ((rows - 1) * len(columns))


def best_row_width(data: bytes, offset: int, length: int) -> Tuple[int, float, float]:
    """`(width, its score, the runner up's score)` over `WIDTH_RANGE`.

    The runner up is returned rather than discarded because a width recovery with no margin is not
    a result. On both Harmony Ones the answer is 176 and the margin over the next best is about a
    fifth, against a worst case twice as large again.
    """
    px = pixels(data, offset, length // PIXEL_BYTES)
    scored = []
    for width in range(WIDTH_RANGE[0], WIDTH_RANGE[1] + 1):
        score = row_score(px, width)
        if score is not None:
            scored.append((score, width))
    scored.sort()
    return scored[0][1], scored[0][0], scored[1][0]


def busiest_window(data: bytes, start: int, end: int, window: int) -> int:
    """The window with the most distinct sixteen bit values, which is where to measure a width.

    A smooth gradient scores well at every width, so measuring on one says nothing. This picks the
    part of the region that has the most to say.
    """
    best, best_count = start, -1
    for offset in range(start, max(start + 1, end - window), window):
        distinct = len(set(pixels(data, offset, window // PIXEL_BYTES)))
        if distinct > best_count:
            best, best_count = offset, distinct
    return best


def blank_screen_runs(data: bytes, start: int, end: int, size: int,
                      slack: int = 8) -> List[Tuple[int, int]]:
    """Runs of zero bytes whose length is `size`, give or take `slack`, as `(offset, length)`.

    The closure that fixes the height. A blank screen is a screen's worth of zero pixels, so if the
    geometry is right the region contains runs of exactly `width * height * PIXEL_BYTES`. `slack`
    absorbs a neighbouring pixel that happens to be zero as well; it is small enough that no other
    run length in the corpus falls inside it.
    """
    out = []
    i = start
    while i < end:
        if data[i]:
            i += 1
            continue
        j = i
        while j < end and not data[j]:
            j += 1
        if size <= j - i <= size + slack:
            out.append((i, j - i))
        i = j
    return out
