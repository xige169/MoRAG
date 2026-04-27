import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    email: str | None = None
    role: Literal["user", "admin"] = "user"


class UserPatch(BaseModel):
    role: Literal["user", "admin"] | None = None
    is_active: bool | None = None
    password: str | None = None


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str | None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogItem(BaseModel):
    message_id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    question: str
    answer: str
    sources: list
    retrieval_mode: str
    retrieval_ms: int | None
    feedback_rating: str | None
    feedback_comment: str | None
    created_at: datetime


class AuditLogsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AuditLogItem]


class StatsResponse(BaseModel):
    total_users: int
    total_knowledge_bases: int
    total_documents: int
    total_sessions: int
    total_messages: int
    satisfied_count: int
    unsatisfied_count: int
