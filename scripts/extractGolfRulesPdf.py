from __future__ import annotations

import argparse
from pathlib import Path

from pypdf import PdfReader


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract text from a golf rules PDF into a plain text file."
    )
    parser.add_argument("input_pdf", help="Absolute or relative path to the input PDF")
    parser.add_argument("output_txt", help="Path to the output TXT file")
    args = parser.parse_args()

    input_path = Path(args.input_pdf).expanduser().resolve()
    output_path = Path(args.output_txt).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    reader = PdfReader(str(input_path))
    pages_text: list[str] = []

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        pages_text.append(f"[[PAGE {index}]]\n{normalized}")

    output_path.write_text("\n\n".join(pages_text), encoding="utf-8")
    print(f"Extracted {len(reader.pages)} pages to {output_path}")


if __name__ == "__main__":
    main()
