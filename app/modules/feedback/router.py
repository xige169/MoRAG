import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.auth.service import get_current_user
from app.models.user import User
from app.modules.feedback.schemas import FeedbackCreate, FeedbackPatch, FeedbackOut
from app.modules.feedback import service

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/messages/{message_id}", response_model=FeedbackOut, status_code=201)
async def submit_feedback(
    message_id: uuid.UUID,
    body: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.submit_feedback(
        message_id, current_user, body.rating, body.comment, db
    )


@router.patch("/messages/{message_id}", response_model=FeedbackOut)
async def update_feedback(
    message_id: uuid.UUID,
    body: FeedbackPatch,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_feedback(
        message_id, current_user, body.model_dump(exclude_none=True), db
    )
