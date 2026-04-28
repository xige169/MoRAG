import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    knowledge_base_ids: list[uuid.UUID] = Field(min_length=1)
    title: str | None = Field(default=None, max_length=255)
    system_prompt: str | None = None
    retrieval_mode: Literal["precise", "broad"] = "precise"
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.70, ge=0, le=1)


class SessionPatch(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    system_prompt: str | None = None
    knowledge_base_ids: list[uuid.UUID] | None = Field(default=None, min_length=1)
    retrieval_mode: Literal["precise", "broad"] | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)
    similarity_threshold: float | None = Field(default=None, ge=0, le=1)


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
    content: str = Field(min_length=1)
