import csv as _csv
from .pdf import parse_pdf
from .docx import parse_docx
from .xlsx import parse_xlsx
from .text import parse_text


def parse_file(file_path: str, file_type: str) -> list[dict]:
    if file_type == "pdf":
        return parse_pdf(file_path)
    elif file_type == "docx":
        return parse_docx(file_path)
    elif file_type == "xlsx":
        return parse_xlsx(file_path)
    elif file_type == "csv":
        return _parse_csv(file_path)
    else:  # md, txt
        return parse_text(file_path)


def _parse_csv(file_path: str) -> list[dict]:
    rows = []
    with open(file_path, encoding="utf-8", errors="replace", newline="") as f:
        reader = _csv.reader(f)
        for row in reader:
            if any(cell.strip() for cell in row):
                rows.append(",".join(row))
    return [{"content": "\n".join(rows), "page_number": None}] if rows else []
