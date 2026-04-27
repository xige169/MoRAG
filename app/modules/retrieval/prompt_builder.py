DEFAULT_ROLE = "专业的知识库问答助手"

SYSTEM_INSTRUCTION = (
    "【引用规则】\n"
    "- 每处引用请在句末用 [数字] 标注来源序号，例如：根据规定[1]，...\n"
    "- 可同时引用多个来源，例如：[1][3]\n"
    "- 如果检索到的内容不足以回答问题，请明确回复："
    "\"在当前知识库中未找到相关内容，建议您补充相关资料。\"\n"
    "- 严禁凭空编造或使用知识库范围以外的信息"
)


def build_system_prompt(role_description: str | None) -> str:
    role = role_description or DEFAULT_ROLE
    return f"你是{role}。请严格基于以下检索到的知识库内容回答用户问题。\n\n{SYSTEM_INSTRUCTION}"


def build_context_block(chunks: list[dict]) -> str:
    if not chunks:
        return ""
    lines = ["【知识库内容】"]
    for c in chunks:
        lines.append(f"[{c['index']}] {c['content']}")
    return "\n".join(lines)


def build_messages(
    query: str,
    chunks: list[dict],
    history: list[dict],
    system_prompt: str | None,
) -> list[dict]:
    messages = [
        {"role": "system", "content": build_system_prompt(system_prompt)}
    ]

    if chunks:
        messages.append({
            "role": "system",
            "content": build_context_block(chunks),
        })

    # Last 6 messages (3 turns)
    for msg in history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": query})
    return messages


def build_retrieval_query(current_query: str, history: list[dict]) -> str:
    """Prepend previous user turn for pronoun/reference resolution."""
    if not history or len(current_query) >= 30:
        return current_query
    last_user = next(
        (m["content"] for m in reversed(history) if m["role"] == "user"), None
    )
    if last_user:
        return f"{last_user} {current_query}"
    return current_query
