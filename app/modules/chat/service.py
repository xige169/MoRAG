import uuid
import json
from typing import AsyncGenerator
import dashscope
from dashscope import Generation
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.chat import ChatSession, ChatMessage
from app.models.user import User
from app.modules.retrieval.service import retrieve
from app.modules.retrieval.prompt_builder import build_messages, build_retrieval_query
from app.core.config import get_settings

settings = get_settings()
dashscope.api_key = settings.dashscope_api_key

NO_CONTEXT_MSG = "在当前知识库中未找到相关内容，建议您补充相关资料。"


async def create_session(
    data: dict, user_id: uuid.UUID, db: AsyncSession
) -> ChatSession:
    session = ChatSession(**data, user_id=user_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_sessions(user: User, db: AsyncSession) -> list[ChatSession]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user.id, ChatSession.is_deleted == False)
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


async def get_session_or_404(
    session_id: uuid.UUID, user: User, db: AsyncSession
) -> ChatSession:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.is_deleted == False
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if user.role != "admin" and session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return session


async def get_history(
    session_id: uuid.UUID, db: AsyncSession
) -> list[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()


async def stream_response(
    session: ChatSession,
    query: str,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    history_objs = await get_history(session.id, db)
    history = [{"role": m.role, "content": m.content} for m in history_objs]

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id, role="user", content=query, sources=[]
    )
    db.add(user_msg)
    await db.commit()

    # Retrieve relevant chunks
    retrieval_query = build_retrieval_query(query, history)
    chunks, retrieval_ms = await retrieve(
        query=retrieval_query,
        kb_ids=session.knowledge_base_ids,
        retrieval_mode=session.retrieval_mode,
        top_k=session.top_k,
        similarity_threshold=session.similarity_threshold,
        db=db,
    )

    if not chunks:
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=NO_CONTEXT_MSG,
            sources=[],
            retrieval_ms=retrieval_ms,
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)
        yield f"data: {json.dumps({'type': 'no_context', 'message': NO_CONTEXT_MSG}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'message_id': str(assistant_msg.id)})}\n\n"
        return

    messages = build_messages(query, chunks, history, session.system_prompt)

    full_content = ""
    input_tokens = 0
    output_tokens = 0

    responses = Generation.call(
        model=settings.llm_model,
        messages=messages,
        result_format="message",
        stream=True,
        incremental_output=True,
    )

    for resp in responses:
        if resp.status_code == 200:
            delta = resp.output.choices[0].message.content or ""
            if delta:
                full_content += delta
                yield f"data: {json.dumps({'type': 'content', 'delta': delta}, ensure_ascii=False)}\n\n"
            if hasattr(resp, "usage") and resp.usage:
                input_tokens = getattr(resp.usage, "input_tokens", 0) or 0
                output_tokens = getattr(resp.usage, "output_tokens", 0) or 0
        else:
            yield f"data: {json.dumps({'type': 'error', 'code': 'LLM_ERROR', 'message': str(resp.message)})}\n\n"
            return

    # Strip raw content field from sources before saving
    sources = [
        {k: v for k, v in c.items() if k not in ("content", "score")}
        for c in chunks
    ]

    yield f"data: {json.dumps({'type': 'sources', 'sources': sources}, ensure_ascii=False, default=str)}\n\n"

    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=full_content,
        sources=sources,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        retrieval_ms=retrieval_ms,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    yield f"data: {json.dumps({'type': 'done', 'message_id': str(assistant_msg.id), 'usage': {'input_tokens': input_tokens, 'output_tokens': output_tokens}})}\n\n"
