"""`tests/proves.py`, the line a Python test carries to say which requirement it proves, decision 33.

The helper checks its own arguments at run time and nothing else, so what is tested here is exactly that: a whole
number, bench models by key, each once, or `'every'`, and records given as paths, each wrong one refused with a
`TypeError` naming it. Whether a proof's number is a requirement, whether its paths exist and whether it agrees with
the written statuses is judged over every proof at once in `packages/base/test/requirements.test.ts`, and that the
helper's keys are the base's in `packages/codec/test/package/requirements.test.ts`.

Called through the module's name, `helper.proves(...)`, so the generator, which reads only a call by the bare name
as a proof, does not take these calls for evidence of anything.
"""
import unittest

import proves as helper


class TheHelperChecksItsArguments(unittest.TestCase):

    def test_a_proof_for_some_models_or_every_one_passes(self):
        helper.proves(1, ['harmony-885'], ['docs/test-notes/harmony-885.md#the-first-unit-h885_a'])
        helper.proves(20, 'every')
        helper.proves(43, ('harmony-600', 'harmony-touch'))

    def test_a_number_that_is_no_requirement_number_is_refused(self):
        for number in (0, -1, 1.5, '1', True):
            with self.subTest(number=number), self.assertRaisesRegex(TypeError, 'no requirement number'):
                helper.proves(number, 'every')

    def test_no_model_a_key_that_is_no_bench_model_and_a_model_twice_are_refused(self):
        with self.assertRaisesRegex(TypeError, 'names no model'):
            helper.proves(1, [])
        with self.assertRaisesRegex(TypeError, "'harmony-520', which is no bench model"):
            helper.proves(1, ['harmony-520'])
        with self.assertRaisesRegex(TypeError, 'a model twice'):
            helper.proves(1, ['harmony-one', 'harmony-one'])
        with self.assertRaisesRegex(TypeError, 'names no model'):
            helper.proves(1, 'harmony-one')

    def test_a_bench_record_that_is_no_path_is_refused(self):
        with self.assertRaisesRegex(TypeError, 'no path'):
            helper.proves(1, ['harmony-one'], [''])
        with self.assertRaisesRegex(TypeError, 'no path'):
            helper.proves(1, ['harmony-one'], [None])

    def test_the_keys_are_the_ten_bench_models(self):
        self.assertEqual(len(helper.BENCH_MODEL_KEYS), 10)
        self.assertEqual(len(set(helper.BENCH_MODEL_KEYS)), 10)


if __name__ == "__main__":
    unittest.main()
