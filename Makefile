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
SRC     := src
TESTS   := tests
GHIDRA  ?= /opt/homebrew/Cellar/ghidra/12.1.2/libexec
JAVA_21 ?= /opt/homebrew/opt/openjdk@21

export PYTHONPATH := $(SRC):$(TESTS)

.PHONY: help test test-verbose lint prose corpus ghidra clean

help:
	@echo "test         run the test suite (needs a lab directory for image-backed tests)"
	@echo "test-verbose same, one line per test"
	@echo "lint         byte-compile everything, catching syntax errors"
	@echo "prose        check documents for em-dashes and en-dashes"
	@echo "corpus      inventory the dumps in the lab directory"
	@echo "ghidra       build or refresh the Ghidra project (needs a lab directory)"

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

corpus:
	@$(PYTHON) tools/corpus.py

ghidra:
	@JAVA_HOME=$(JAVA_21) GHIDRA_HOME=$(GHIDRA) ./bin/setup-ghidra.sh

clean:
	@find . -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null; true
	@find . -name '*.pyc' -delete
	@echo "cleaned"
