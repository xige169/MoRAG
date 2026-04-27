import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.feedback import MessageFeedback
from app.models.chat import ChatMessage
from app.models.user import User


async def submit_feedback(
    message_id: uuid.UUID,
    user: User,
    rating: str,
    comment: str | None,
    db: AsyncSession,
) -> MessageFeedback:
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Message not found")

    existing = await db.execute(
        select(MessageFeedback).where(
            MessageFeedback.message_id == message_id,
            MessageFeedback.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Feedback already submitted. Use PATCH to update.",
        )

    fb = MessageFeedback(
        message_id=message_id, user_id=user.id, rating=rating, comment=comment
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb


async def update_feedback(
    message_id: uuid.UUID,
    user: User,
    data: dict,
    db: AsyncSession,
) -> MessageFeedback:
    result = await db.execute(
        select(MessageFeedback).where(
            MessageFeedback.message_id == message_id,
            MessageFeedback.user_id == user.id,
        )
    )
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    for k, v in data.items():
        setattr(fb, k, v)
    await db.commit()
    await db.refresh(fb)
    return fb
