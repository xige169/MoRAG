import uuid
from datetime import datetime
from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    knowledge_base_id: uuid.UUID
    original_name: str
    file_type: str
    file_size: int
    status: str
    error_message: str | None
    chunk_count: int
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentPatch(BaseModel):
    original_name: str | None = None
    is_enabled: bool | None = None


class ChunkOut(BaseModel):
    chunk_index: int
    page_number: int | None
    content: str
    char_count: int


class ChunksResponse(BaseModel):
    doc_id: uuid.UUID
    doc_name: str
    chunk_count: int
    chunks: list[ChunkOut]
