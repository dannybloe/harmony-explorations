"""`proves`, the line inside a test that says which requirement of the FHSDK the test proves, and for which bench
models, decision 33. The Python half of `packages/testkit/src/proof.ts`, whose docstring is the whole account.

In short: called as the first statement of the test method whose body shows the requirement, with literal arguments
only, because `packages/codec/bin/requirements.ts` reads the call off the source and never runs a test:

    proves(71, ['harmony-touch'], ['packages/usb/test/touch/touch-first-sync.test.ts'])

the requirement's number, the keys of the bench models it is proven for or `'every'`, and where the requirement
shows on a remote, the bench record: a bench test or a passage of `docs/test-notes/` by its heading's anchor. Each
model's met is derived from these calls, and only open, unknown and impossible are written by hand.

At run time it checks its own arguments and does nothing else. It cannot ask the requirements data, which is
TypeScript, so it checks that the number is a positive whole number and that every key is one of the bench models'
keys below; that list is held equal to the TypeScript one by `packages/codec/test/package/requirements.test.ts`, and
whether the number is a requirement is judged there too, over every proof at once. A call through another name,
`module.proves(...)`, is not read as a proof, which is how this helper's own test passes it wrong arguments.
"""

#: The bench models' keys, the names of their folders under `reference/remotes/`, in the order
#: `packages/base/src/requirements.ts` lists them. Held to that list by the generator's test.
BENCH_MODEL_KEYS = (
    'harmony-one', 'harmony-600', 'harmony-650', 'harmony-700', 'harmony-525', 'harmony-885', 'harmony-785',
    'harmony-300', 'harmony-350', 'harmony-touch',
)


def proves(number, models, bench=()):
    """Say that the test this is called in proves requirement `number` for `models`, shown on a unit in `bench`.

    Raises `TypeError` naming the fault when the arguments are not a number, bench models and paths, so a mistyped
    proof fails its test rather than being read as evidence."""
    if isinstance(number, bool) or not isinstance(number, int) or number < 1:
        raise TypeError(f'proves: {number!r} is no requirement number')
    if models != 'every':
        if not isinstance(models, (list, tuple)) or not models:
            raise TypeError(f'proves: R{number} names no model')
        for key in models:
            if key not in BENCH_MODEL_KEYS:
                raise TypeError(f'proves: R{number} names {key!r}, which is no bench model')
        if len(set(models)) != len(models):
            raise TypeError(f'proves: R{number} names a model twice')
    for path in bench:
        if not isinstance(path, str) or not path:
            raise TypeError(f'proves: R{number} names a bench record that is no path')
