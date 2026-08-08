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
PNPM    ?= pnpm
SRC     := src
TESTS   := tests
GHIDRA  ?= /opt/homebrew/Cellar/ghidra/12.1.2/libexec
JAVA_21 ?= /opt/homebrew/opt/openjdk@21

export PYTHONPATH := $(SRC):$(TESTS)

.PHONY: help test test-verbose lint prose facts facts-write corpus ghidra ts ts-test ts-typecheck audit hooks golden golden-write bench probe remotes watch-keys watch-columns coverage all clean

BENCH_PORT ?= 8731

help:
	@echo "test         run the Python test suite (needs a lab directory for image-backed tests)"
	@echo "test-verbose same, one line per test"
	@echo "lint         byte-compile everything, catching syntax errors"
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
	@echo "facts        check the numbers and the dead claims in the documents; facts-write fixes numbers"
	@echo "all          everything above except ghidra, bench and probe"

test:
	@$(PYTHON) -m unittest discover -s $(TESTS)
	@if [ -z "$$HARMONY_LAB" ] && [ ! -d ../lab ]; then \
	  echo; echo "note: no lab directory found, so image-backed tests were skipped."; \
	  echo "      set HARMONY_LAB, or put one alongside the repository."; fi

test-verbose:
	@$(PYTHON) -m unittest discover -s $(TESTS) -v

lint:
	@$(PYTHON) -m compileall -q $(SRC) $(TESTS) tools && echo "compiles clean"

# Published documents must not contain em-dashes or en-dashes. The check is written with
# escapes so this Makefile does not itself contain the characters it looks for.
prose:
	@fail=0; for f in $$(find . -name '*.md' -not -path './.git/*'); do \
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

all: lint prose facts test ts audit

clean:
	@find . -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null; true
	@find . -name '*.pyc' -delete
	@echo "cleaned"
