from app.modules.retrieval.prompt_builder import (
    build_fallback_messages,
    build_system_prompt,
)


def test_system_prompt_requires_markdown_structure():
    prompt = build_system_prompt(None)

    assert "Markdown" in prompt
    assert "## 结论" in prompt
    assert "GFM 表格" in prompt
    assert "代码块" in prompt
    assert "[数字]" in prompt


def test_fallback_prompt_uses_same_markdown_format():
    messages = build_fallback_messages("如何部署？", [], None)

    system_content = messages[0]["content"]
    assert "Markdown" in system_content
    assert "## 结论" in system_content
