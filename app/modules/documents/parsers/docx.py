from docx import Document


def parse_docx(file_path: str) -> list[dict]:
    doc = Document(file_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    if not paragraphs:
        return []
    return [{"content": "\n".join(paragraphs), "page_number": None}]
