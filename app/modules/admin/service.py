import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException

from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document
from app.models.chat import ChatSession, ChatMessage
from app.models.feedback import MessageFeedback
from app.core.security import hash_password


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


async def create_user(data: dict, db: AsyncSession) -> User:
    existing = await db.execute(
        select(User).where(User.username == data["username"])
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already exists")
    password = data.pop("password")
    user = User(**data, hashed_password=hash_password(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def patch_user(
    user_id: uuid.UUID, data: dict, db: AsyncSession
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if "password" in data:
        user.hashed_password = hash_password(data.pop("password"))
    for k, v in data.items():
        if v is not None:
            setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


async def get_audit_logs(
    page: int,
    page_size: int,
    db: AsyncSession,
    user_id: uuid.UUID | None = None,
    rating: str | None = None,
) -> dict:
    base_q = (
        select(ChatMessage, ChatSession, User, MessageFeedback)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .join(User, ChatSession.user_id == User.id)
        .outerjoin(MessageFeedback, MessageFeedback.message_id == ChatMessage.id)
        .where(ChatMessage.role == "assistant")
    )
    if user_id:
        base_q = base_q.where(ChatSession.user_id == user_id)
    if rating:
        base_q = base_q.where(MessageFeedback.rating == rating)

    count_result = await db.execute(
        select(func.count()).select_from(base_q.subquery())
    )
    total = count_result.scalar_one()

    data_q = (
        base_q.order_by(ChatMessage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(data_q)

    items = []
    for msg, session, user, fb in result.all():
        prev_result = await db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.session_id == session.id,
                ChatMessage.role == "user",
                ChatMessage.created_at < msg.created_at,
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        user_msg = prev_result.scalar_one_or_none()
        items.append({
            "message_id": msg.id,
            "session_id": session.id,
            "user_id": user.id,
            "username": user.username,
            "question": user_msg.content if user_msg else "",
            "answer": msg.content,
            "sources": msg.sources or [],
            "is_fallback": msg.is_fallback,
            "retrieval_mode": session.retrieval_mode,
            "retrieval_ms": msg.retrieval_ms,
            "feedback_rating": fb.rating if fb else None,
            "feedback_comment": fb.comment if fb else None,
            "created_at": msg.created_at,
        })

    return {"total": total, "page": page, "page_size": page_size, "items": items}


async def get_stats(db: AsyncSession) -> dict:
    u = await db.execute(select(func.count()).select_from(User))
    kb = await db.execute(
        select(func.count())
        .select_from(KnowledgeBase)
        .where(KnowledgeBase.is_active == True)
    )
    d = await db.execute(select(func.count()).select_from(Document))
    s = await db.execute(
        select(func.count())
        .select_from(ChatSession)
        .where(ChatSession.is_deleted == False)
    )
    m = await db.execute(select(func.count()).select_from(ChatMessage))
    sat = await db.execute(
        select(func.count())
        .select_from(MessageFeedback)
        .where(MessageFeedback.rating == "up")
    )
    unsat = await db.execute(
        select(func.count())
        .select_from(MessageFeedback)
        .where(MessageFeedback.rating == "down")
    )
    return {
        "total_users": u.scalar_one(),
        "total_knowledge_bases": kb.scalar_one(),
        "total_documents": d.scalar_one(),
        "total_sessions": s.scalar_one(),
        "total_messages": m.scalar_one(),
        "satisfied_count": sat.scalar_one(),
        "unsatisfied_count": unsat.scalar_one(),
    }
