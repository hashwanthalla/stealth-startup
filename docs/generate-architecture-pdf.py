#!/usr/bin/env python3
"""Build CodeViz architecture docs (PDF from Markdown)."""

import subprocess
import sys
from pathlib import Path

DOCS = Path(__file__).parent
MD = DOCS / "CodeViz-Architecture-Design.md"
PDF = DOCS / "CodeViz-Architecture-Design.pdf"
HTML = DOCS / "CodeViz-Architecture-Design.html"


def main() -> None:
    if not MD.exists():
        print(f"Missing source: {MD}", file=sys.stderr)
        sys.exit(1)

    print(f"Generating PDF from {MD.name} …")
    subprocess.run(
        ["npx", "--yes", "md-to-pdf", str(MD)],
        cwd=DOCS,
        check=True,
    )

    if PDF.exists():
        size_kb = PDF.stat().st_size // 1024
        print(f"Wrote {PDF} ({size_kb} KB)")
    else:
        print("PDF generation finished but output file not found.", file=sys.stderr)
        sys.exit(1)

    print(f"\nReadable formats:")
    print(f"  Markdown : {MD}")
    print(f"  HTML     : {HTML}  (open in browser → Print → Save as PDF)")
    print(f"  PDF      : {PDF}")


if __name__ == "__main__":
    main()
