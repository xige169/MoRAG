import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    rating: Literal["up", "down"]
    comment: str | None = None


class FeedbackPatch(BaseModel):
    rating: Literal["up", "down"] | None = None
    comment: str | None = None


class FeedbackOut(BaseModel):
    id: uuid.UUID
    message_id: uuid.UUID
    user_id: uuid.UUID
    rating: str
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
