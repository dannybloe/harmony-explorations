"""Put ../src on sys.path so the CLI wrappers work without installation."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))
