import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.auth.service import get_current_user
from app.models.user import User
from app.modules.knowledge.schemas import KBCreate, KBUpdate, KBOut
from app.modules.knowledge import service

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


@router.get("", response_model=list[KBOut])
async def list_kbs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kbs = await service.list_kbs(current_user, db)
    result = []
    for kb in kbs:
        doc_count = await service.get_doc_count(kb.id, db)
        out = KBOut.model_validate(kb)
        out.doc_count = doc_count
        result.append(out)
    return result


@router.post("", response_model=KBOut, status_code=201)
async def create_kb(
    body: KBCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kb = await service.create_kb(body.model_dump(), current_user.id, db)
    out = KBOut.model_validate(kb)
    out.doc_count = 0
    return out


@router.get("/{kb_id}", response_model=KBOut)
async def get_kb(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kb = await service.get_kb_or_404(kb_id, current_user, db)
    doc_count = await service.get_doc_count(kb.id, db)
    out = KBOut.model_validate(kb)
    out.doc_count = doc_count
    return out


@router.put("/{kb_id}", response_model=KBOut)
async def update_kb(
    kb_id: uuid.UUID,
    body: KBUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kb = await service.get_kb_or_404(kb_id, current_user, db)
    kb = await service.update_kb(kb, body.model_dump(exclude_none=True), db)
    out = KBOut.model_validate(kb)
    out.doc_count = await service.get_doc_count(kb.id, db)
    return out


@router.delete("/{kb_id}", status_code=204)
async def delete_kb(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kb = await service.get_kb_or_404(kb_id, current_user, db)
    await service.delete_kb(kb, db)
