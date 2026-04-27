import fitz  # PyMuPDF


def parse_pdf(file_path: str) -> list[dict]:
    blocks = []
    with fitz.open(file_path) as doc:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                blocks.append({"content": text, "page_number": page_num})
    return blocks
