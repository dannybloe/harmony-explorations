# Development tasks. Nothing here needs anything beyond a Python 3 install.
#
# Tests that need firmware images look for HARMONY_LAB and skip cleanly without it,
# because the binaries are not in this repository. See reference/checksums.md.
#
#   export HARMONY_LAB=/path/to/lab
#
# A `lab` directory alongside the repository is picked up automatically, so in the usual
# checkout no environment variable is needed.

PYTHON  ?= python3
# Run independent targets concurrently, which is what makes `make all` bearable. Measured on 23
# August 2026, on this machine, with everything passing at both settings:
#
#   serial   about 5:50   (350s of CPU work at one core)
#   -j4            1:44
#   -j8            1:45
#
# So -j4 is not a guess and -j8 buys nothing: the floor is the Python suite itself, 105s and single
# threaded, and `all` runs it three times over (test, test-nolab, test-partial) plus the TypeScript
# suite. -j4 reaches that floor, so the only way lower is splitting the suite, which is not worth a
# dependency. Raise it with `make -j8 all` if the mix ever changes; the variable is overridable.
#
# **Two things to know when it fails.** This is Apple's GNU Make 3.81, which has no `--output-sync`,
# so concurrent targets interleave their output and a failure is hard to read: make still names the
# target in `*** [target] Error`, so re-run that one alone. And the one hazard here is `lint`, whose
# `compileall` writes the same `.pyc` files the three suites are importing. Two clean runs is evidence
# and not proof, so a weird import error under -j is worth trying serially before believing it.
MAKEFLAGS += -j4

PNPM    ?= pnpm
SRC     := src
TESTS   := tests
GHIDRA  ?= /opt/homebrew/Cellar/ghidra/12.1.2/libexec
JAVA_21 ?= /opt/homebrew/opt/openjdk@21

export PYTHONPATH := $(SRC):$(TESTS)

.PHONY: help test test-nolab test-partial test-verbose lint pyright prose facts facts-write corpus ghidra ts ts-test ts-typecheck audit hooks golden golden-write bench probe remotes watch-keys watch-columns coverage emit reading growth text render page activities devices alphabets silhouettes all clean protocols

BENCH_PORT ?= 8731

help:
	@echo "test         run the Python test suite (needs a lab directory for image-backed tests)"
	@echo "test-verbose same, one line per test"
	@echo "lint         byte-compile everything, catching syntax errors"
	@echo "pyright      the Python type checks, at the level pyrightconfig.json argues for"
	@echo "prose        check documents for em-dashes and en-dashes"
	@echo "corpus      inventory the dumps in the lab directory"
	@echo "ghidra       build or refresh the Ghidra project (needs a lab directory)"
	@echo "ts           typecheck and test the TypeScript packages"
	@echo "audit        check the npm dependency tree for known vulnerabilities"
	@echo "hooks        install the pre-commit hook (per clone, so run it once after cloning)"
	@echo "golden       compare the golden vectors; golden-write regenerates them"
	@echo "remotes      list attached remotes, enumeration only, opens nothing"
	@echo "bench        start the bench instrument on 127.0.0.1:$(BENCH_PORT)"
	@echo "probe        structural report about an attached remote, publishable; PROBE_ARGS=--file X"
	@echo "watch-keys   poll the keypad scanner's RAM on an attached remote, read only"
	@echo "watch-columns report the matrix column of every key pressed, read only"
	@echo "coverage     byte accounting per sample; COVERAGE_ARGS=--detail for owners and gaps"
	@echo "emit         how much of each sample the emitter can put back; EMIT_ARGS=--detail"
	@echo "growth       what a length change would move, per sample; GROWTH_ARGS=--detail"
	@echo "reading      the step 6 depth number; READING_ARGS=--detail for one line a sample"
	@echo "text         how much on screen text reads back as characters; TEXT_ARGS=--detail"
	@echo "render       draw a config's screens as PNG; RENDER_ARGS=--config X --page N"
	@echo "silhouettes  regenerate the remote face drawings; SILHOUETTE_ARGS=--preview"
	@echo "page         drive the bench page in Chrome, which is what checks the page itself"
	@echo "activities   which activity each key starts, and which label is its name"
	@echo "devices      which devices a config drives, and what each one is called"
	@echo "alphabets    regenerate the glyph shape table; ALPHABETS_ARGS=--write"
	@echo "facts        check the numbers and the dead claims in the documents; facts-write fixes numbers"
	@echo "test-nolab   the suite against a nonexistent lab: it must skip, not assert"
	@echo "test-partial the suite against a lab holding one sample: no test may pass partially"
	@echo "all          everything above except ghidra, bench and probe"

test:
	@$(PYTHON) -m unittest discover -s $(TESTS)
	@if [ -z "$$HARMONY_LAB" ] && [ ! -d ../lab ]; then \
	  echo; echo "note: no lab directory found, so image-backed tests were skipped."; \
	  echo "      set HARMONY_LAB, or put one alongside the repository."; fi

test-verbose:
	@$(PYTHON) -m unittest discover -s $(TESTS) -v

# A fresh clone with no lab must skip cleanly, and this is what makes that enforced instead of
# asserted. CLAUDE.md has claimed it was enforced since 8 August 2026 and nothing ran it: one test
# slipped through and trelowney found it on 10 August 2026 by doing exactly this. The shape it
# catches is a corpus wide assertion after a `subTest` loop, because a skip inside `subTest` skips
# that sample and lets the loop finish, so the aggregate then runs against zero.
#
# `NO_COLOR=1` on the diagnostic line is load bearing, not cosmetic. Python 3.14's unittest colours
# its summary even through a pipe and puts the reset sequence between `FAIL` and `: test`, so a grep
# for `FAIL: test` matches nothing and the failure list comes back empty while the target correctly
# exits 1. That has now cost time twice in one day, once here and once at a shell prompt.
test-nolab:
	@HARMONY_LAB=$(CURDIR)/.nolab-does-not-exist $(PYTHON) -m unittest discover -s $(TESTS) \
	  > /dev/null 2>&1 && echo "skips cleanly with no lab" || \
	  { echo "FAILED with no lab: something asserts rather than skipping"; \
	    NO_COLOR=1 HARMONY_LAB=$(CURDIR)/.nolab-does-not-exist $(PYTHON) -m unittest discover \
	      -s $(TESTS) 2>&1 | grep -E '^(FAIL|ERROR): test' ; exit 1; }
	@HARMONY_LAB=$(CURDIR)/.nolab-does-not-exist $(PNPM) test \
	  > /dev/null 2>&1 && echo "TypeScript skips cleanly with no lab" || \
	  { echo "FAILED with no lab on the TypeScript side: run it yourself to see which"; exit 1; }

# The case between a full lab and no lab, which neither `test` nor `test-nolab` can see. A skip
# inside `subTest` skips that sample and lets the loop finish, so a test with half its samples
# present asserts over half of them and still reports a pass, with its title unchanged. There is no
# failure for `test-nolab` to find, because passing is the bug. Measured on 13 August 2026: 43 tests
# behaved this way against a lab holding one sample.
test-partial:
	@$(PYTHON) bin/check-partial-lab.py

# `bin` is here because it was not, until 13 August 2026: `check-publishable.py` runs in the
# pre-commit hook and was byte compiled by nothing, which is the same shape as the tsconfig bug
# `tests/test_toolchain.py` exists for, one language across. `pyrightconfig.json` already included it.
lint:
	@$(PYTHON) -m compileall -q $(SRC) $(TESTS) tools bin && echo "compiles clean"

# The Python half of what `ts-typecheck` does for the TypeScript half, at the level
# `pyrightconfig.json` argues for: type checking off, and the rules that catch what a compiler
# catches on individually. It is the same tool the editor's language server runs, so a finding in one
# is a finding in the other, and it exists as a target because a check only an editor performs is a
# check a script never fails.
#
# The workspace's own copy first, because pyright's version decides which diagnostics exist: an
# upgrade can turn this from zero errors to a dozen with no line of code changed, so the number is
# only meaningful against a pinned one. `PATH` second, for anyone who has it globally and no
# `pnpm install`. Neither is a skip and not a failure, since this repository's floor is a Python 3
# install and nothing else.
PYRIGHT ?= $(if $(wildcard node_modules/.bin/pyright),node_modules/.bin/pyright,$(shell command -v pyright 2>/dev/null))

pyright:
	@if [ -z "$(PYRIGHT)" ]; then \
	  echo "no pyright installed, so the Python type checks were skipped"; \
	else \
	  $(PYRIGHT) --outputjson | $(PYTHON) -c "import json,sys; s=json.load(sys.stdin)['summary']; \
	    print('pyright:', s['errorCount'], 'error(s) in', s['filesAnalyzed'], 'files'); \
	    sys.exit(1 if s['errorCount'] else 0)"; \
	fi

# Published documents must not contain em-dashes or en-dashes. The check is written with
# escapes so this Makefile does not itself contain the characters it looks for.
# House convention: no em-dashes and no en-dashes in anything published here. `node_modules` is excluded
# because it holds other people's documents, and until playwright arrived nothing in there had one.
prose:
	@fail=0; for f in $$(find . -name '*.md' -not -path './.git/*' -not -path './node_modules/*'); do \
	  n=$$($(PYTHON) -c "import sys;d=open(sys.argv[1]).read();print(sum(d.count(c) for c in '—–'))" $$f); \
	  if [ "$$n" != "0" ]; then echo "$$f: $$n"; fail=1; fi; done; \
	  if [ $$fail = 0 ]; then echo "prose clean"; else exit 1; fi

# The documents must agree with the code. Two checks, both from one audit that found eleven places
# where they did not: every value carrying a `fact:` marker is recomputed from the corpus, and every
# phrasing listed in reference/superseded.md must not appear as a live assertion. The numeric half
# needs a lab and skips cleanly without one; the phrase half is pure text and always runs.
facts:
	@$(PYTHON) tools/facts.py

facts-write:
	@$(PYTHON) tools/facts.py --write

corpus:
	@$(PYTHON) tools/corpus.py

ghidra:
	@JAVA_HOME=$(JAVA_21) GHIDRA_HOME=$(GHIDRA) ./bin/setup-ghidra.sh

# The TypeScript side. The test runner is Node's own, so the whole dependency tree is the
# compiler plus its type definitions: nothing else is installed and nothing else can go stale.
# Node's type stripping runs the sources directly, so `ts-test` does not need `ts-typecheck`
# first; they check different things and both are wanted.
ts: ts-typecheck ts-test

ts-typecheck:
	@$(PNPM) run typecheck && echo "typechecks clean"

ts-test:
	@$(PNPM) test

audit:
	@$(PNPM) audit

# Golden vectors: what the Python parser says about each sample, for the TypeScript port to
# match. They live in the lab directory, because a vector maps somebody's actual configuration.
golden:
	@$(PYTHON) tools/golden.py

golden-write:
	@$(PYTHON) tools/golden.py --write

# Asking the operating system what is attached. Opens nothing, so it is safe to run at any time
# and is the right first move when a remote is plugged in.
remotes:
	@node packages/usb/bin/list-remotes.ts

# The contribution probe: a publishable structural report about an attached remote. Opens the
# device, so it is deliberate, unlike `remotes`. Pass a file instead to run it without hardware.
probe:
	@node packages/probe/bin/probe.ts $(PROBE_ARGS)

# Byte accounting: what fraction of each config the codec can attribute to a structure. The
# progress measure for M2, since an emitter can only rebuild what a reader can attribute.
coverage:
	@node packages/codec/bin/coverage.ts $(COVERAGE_ARGS)

emit:
	@node packages/codec/bin/emit.ts $(EMIT_ARGS)

growth:
	@node packages/codec/bin/growth.ts $(GROWTH_ARGS)

reading:
	@node packages/codec/bin/reading.ts $(READING_ARGS)

text:
	@node packages/codec/bin/text.ts $(TEXT_ARGS)

# Ask Logitech's own analyser what a code in the corpus is and compare it with what we read. Not part
# of `all` and never will be: it needs a network and somebody's credentials, and the whole point of it
# is a second opinion from outside this repository. Read only in both directions, and it refuses to
# start without the two environment variables rather than reporting a page of access denials.
analyze:
	@node packages/codec/bin/analyze.ts $(ANALYZE_ARGS)

# What rhythm each protocol family uses, measured off the corpus against the family names Logitech's own
# analyser gave it, and the generated table that lets a code stated as a name and a number be emitted.
# Needs a lab because it reads the analyser reports, needs no network. PROTOCOLS_ARGS=--detail, or
# --write to regenerate packages/codec/src/protocols.ts.
protocols:
	@node packages/codec/bin/protocols.ts $(PROTOCOLS_ARGS)

# Drive the bench page in a real browser. Not part of `all`, and not part of `ts`, for the same reason
# the hardware tests are gated: it launches Chrome, and a suite that is slow stops being run. It skips
# cleanly where there is no Chrome, since no browser is downloaded on purpose.
page:
	@HARMONY_PAGE_TESTS=1 node --test --experimental-strip-types packages/bench/test/page.test.ts

# Draw a config's screens as PNG files, into the private lab rather than into the repository, because a
# rendered screen is a picture of somebody's own equipment. Not part of `all`: it writes files.
# The remote face drawings. `reference/silhouettes/*.svg` is generated output, so this is what changes
# them; editing the SVG by hand fails the suite. SILHOUETTE_ARGS=--preview also writes an overlay page
# into the lab, the drawing over the photograph it was measured from, which is the check that decides
# whether a drawing is right. Every test in the package can pass on a key in the wrong place.
silhouettes:
	@node packages/silhouettes/bin/generate.ts $(SILHOUETTE_ARGS)

render:
	@node packages/codec/bin/render.ts $(RENDER_ARGS)

# Which activity a key starts and which drawn label is its name, per container and per architecture.
activities:
	@node packages/codec/bin/activities.ts $(ACTIVITIES_ARGS)

devices:
	@node packages/codec/bin/devices.ts $(DEVICES_ARGS)

# The glyph shape table behind `text`, regenerated from the hand read seeds in the same script.
# Not part of `all`: it needs a lab, and the check it would run there is a test already.
alphabets:
	@node packages/codec/bin/alphabets.ts $(ALPHABETS_ARGS)

# The button mapping experiment: poll the keypad scanner's own variable over USB while a human
# presses every key. Read only, and long running like `bench`, so it is not part of `all`.
watch-keys:
	@node packages/usb/bin/watch-keys.ts $(WATCH_ARGS)

# The column half of that experiment, which is the half a remote in sync mode will give up.
watch-columns:
	@node packages/usb/bin/watch-columns.ts $(WATCH_ARGS)

# The bench instrument. Not part of `all`: it is a long running server, not a check.
#
# It binds to 127.0.0.1 only. That is a concession this project makes for a bench tool and refuses
# for the product; FreeHarmony gets a content security policy instead. See docs/roadmap.md step 5.
bench:
	@node packages/bench/bin/bench.ts --port $(BENCH_PORT)

# Git does not commit .git/hooks, so the hook lives in .githooks and this points git at it.
# Per clone, which is why the same checks are also reachable from `make` targets: a fresh
# checkout that never runs this is unprotected, and nobody notices until it matters.
hooks:
	@git config core.hooksPath .githooks
	@echo "core.hooksPath set to .githooks; pre-commit checks are live in this clone"

all: lint pyright prose facts test test-nolab test-partial ts audit

clean:
	@find . -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null; true
	@find . -name '*.pyc' -delete
	@echo "cleaned"
