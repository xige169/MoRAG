import uuid
from datetime import datetime
from pydantic import BaseModel


class SessionCreate(BaseModel):
    knowledge_base_ids: list[uuid.UUID]
    title: str | None = None
    system_prompt: str | None = None
    retrieval_mode: str = "precise"
    top_k: int = 5
    similarity_threshold: float = 0.70


class SessionPatch(BaseModel):
    title: str | None = None
    system_prompt: str | None = None
    retrieval_mode: str | None = None
    top_k: int | None = None
    similarity_threshold: float | None = None


class SessionOut(BaseModel):
    id: uuid.UUID
    title: str | None
    knowledge_base_ids: list[uuid.UUID]
    system_prompt: str | None
    retrieval_mode: str
    top_k: int
    similarity_threshold: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    sources: list
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str
