DEFAULT_ROLE = "专业的知识库问答助手"

MARKDOWN_FORMAT_INSTRUCTION = (
    "【回答格式】\n"
    "- 请使用 Markdown 输出，让答案具备清晰层级关系。\n"
    "- 复杂问题优先按 `## 结论`、`## 依据`、`## 建议` 等小标题组织；"
    "简单问题可以省略小标题。\n"
    "- 比较类内容优先使用 GFM 表格；步骤类内容使用有序列表；"
    "要点类内容使用无序列表。\n"
    "- 代码、命令或配置请使用带语言名的代码块，例如 ```bash。\n"
    "- 不要把整段回答包裹在代码块中。"
)

SYSTEM_INSTRUCTION = (
    f"{MARKDOWN_FORMAT_INSTRUCTION}\n\n"
    "【引用规则】\n"
    "- 每处引用请在句末用 [数字] 标注来源序号，例如：根据规定[1]，...\n"
    "- 可同时引用多个来源，例如：[1][3]\n"
    "- 引用标记必须保留在对应结论或依据的句末，不要单独生成引用列表。\n"
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


FALLBACK_SYSTEM = (
    "当前知识库中没有与用户问题直接相关的内容，"
    "请基于你的通用知识正常、简洁地回答用户的问题。"
    "回答仍需遵循 Markdown 格式规范。"
    "如果问题涉及用户专属的内部资料且你无法确定，请如实告知，"
    "并建议用户将相关资料补充到知识库。"
)


def build_fallback_messages(
    query: str,
    history: list[dict],
    system_prompt: str | None,
) -> list[dict]:
    role = system_prompt or DEFAULT_ROLE
    messages = [
        {
            "role": "system",
            "content": f"你是{role}。{FALLBACK_SYSTEM}\n\n{MARKDOWN_FORMAT_INSTRUCTION}",
        }
    ]
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
