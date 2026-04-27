import uuid
from datetime import datetime
from pydantic import BaseModel


class KBCreate(BaseModel):
    name: str
    description: str | None = None


class KBUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class KBOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    owner_id: uuid.UUID
    is_active: bool
    doc_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
