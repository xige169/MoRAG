import uuid
import json
from typing import AsyncGenerator
import dashscope
from dashscope import Generation
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.chat import ChatSession, ChatMessage
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.modules.retrieval.service import retrieve
from app.modules.retrieval.prompt_builder import (
    build_messages,
    build_fallback_messages,
    build_retrieval_query,
)
from app.core.config import get_settings

settings = get_settings()
dashscope.api_key = settings.dashscope_api_key


async def create_session(
    data: dict, user: User, db: AsyncSession
) -> ChatSession:
    await validate_kb_access(data["knowledge_base_ids"], user, db)
    session = ChatSession(**data, user_id=user.id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def validate_kb_access(
    kb_ids: list[uuid.UUID], user: User, db: AsyncSession
) -> None:
    if not kb_ids:
        raise HTTPException(status_code=422, detail="At least one knowledge base is required")

    unique_ids = set(kb_ids)
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id.in_(unique_ids),
            KnowledgeBase.is_active == True,
        )
    )
    kbs = result.scalars().all()
    if len(kbs) != len(unique_ids):
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if user.role != "admin" and any(kb.owner_id != user.id for kb in kbs):
        raise HTTPException(status_code=403, detail="Forbidden knowledge base")


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


async def update_session(
    session: ChatSession, data: dict, user: User, db: AsyncSession
) -> ChatSession:
    if "knowledge_base_ids" in data:
        await validate_kb_access(data["knowledge_base_ids"], user, db)
    for k, v in data.items():
        setattr(session, k, v)
    await db.commit()
    await db.refresh(session)
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

    is_fallback = not chunks
    if is_fallback:
        messages = build_fallback_messages(query, history, session.system_prompt)
        yield f"data: {json.dumps({'type': 'fallback'}, ensure_ascii=False)}\n\n"
    else:
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

    if is_fallback:
        sources = []
    else:
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
        is_fallback=is_fallback,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        retrieval_ms=retrieval_ms,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    yield f"data: {json.dumps({'type': 'done', 'message_id': str(assistant_msg.id), 'usage': {'input_tokens': input_tokens, 'output_tokens': output_tokens}})}\n\n"
