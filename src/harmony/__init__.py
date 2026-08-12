"""Tools for reverse engineering Logitech Harmony remote configs and firmware.

MIT licensed, see LICENSE at the repository root. Produced by Claude (Anthropic's AI) as
part of an offline analysis; see docs/findings.md for method and known-weaker claims.
Deliberately empty of code, and deliberately without an `__all__`. It used to carry one naming
four submodules, which only ever affected `from harmony import *` and which nothing here does:
every caller says `from harmony import gspm`, which resolves the submodule without it. It was
also three modules out of date, which is how we know nobody was maintaining it. Removed on
12 August 2026 so that pyright's `reportUnsupportedDunderAll` can stay on, since a name in
`__all__` that is a submodule rather than an attribute is something it cannot see.
"""
