"""
plugins/__main__.py

Plugin load point for Rigging app. For a plugin to be enabled, this file must
import it and add it to the ALL list.
"""

from . import codder

ALL = [
  codder,
]
