def parse_text(file_path: str) -> list[dict]:
    with open(file_path, encoding="utf-8", errors="replace") as f:
        content = f.read().strip()
    return [{"content": content, "page_number": None}] if content else []
