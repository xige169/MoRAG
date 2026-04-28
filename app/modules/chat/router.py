import uuid
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from app.core.database import get_db
from app.modules.auth.service import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.modules.chat.schemas import (
    SessionCreate, SessionPatch, SessionOut, MessageOut, SendMessageRequest
)
from app.modules.chat import service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=SessionOut, status_code=201)
async def create_session(
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_session(body.model_dump(), current_user, db)


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_sessions(current_user, db)


@router.get("/sessions/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_session_or_404(session_id, current_user, db)


@router.patch("/sessions/{session_id}", response_model=SessionOut)
async def patch_session(
    session_id: uuid.UUID,
    body: SessionPatch,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await service.get_session_or_404(session_id, current_user, db)
    return await service.update_session(
        session, body.model_dump(exclude_none=True), current_user, db
    )


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await service.get_session_or_404(session_id, current_user, db)
    session.is_deleted = True
    await db.commit()


@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
async def get_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.get_session_or_404(session_id, current_user, db)
    return await service.get_history(session_id, db)


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: uuid.UUID,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await service.get_session_or_404(session_id, current_user, db)
    return StreamingResponse(
        service.stream_response(session, body.content, db),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/sessions/{session_id}/messages", status_code=204)
async def clear_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.get_session_or_404(session_id, current_user, db)
    await db.execute(
        delete(ChatMessage).where(ChatMessage.session_id == session_id)
    )
    await db.commit()
