import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document
from app.models.user import User
from app.core.milvus_client import create_kb_collection, drop_kb_collection


async def list_kbs(user: User, db: AsyncSession) -> list[KnowledgeBase]:
    if user.role == "admin":
        result = await db.execute(
            select(KnowledgeBase).where(KnowledgeBase.is_active == True)
        )
    else:
        result = await db.execute(
            select(KnowledgeBase).where(
                KnowledgeBase.owner_id == user.id,
                KnowledgeBase.is_active == True,
            )
        )
    return result.scalars().all()


async def get_doc_count(kb_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Document)
        .where(Document.knowledge_base_id == kb_id)
    )
    return result.scalar_one()


async def create_kb(
    data: dict, owner_id: uuid.UUID, db: AsyncSession
) -> KnowledgeBase:
    kb = KnowledgeBase(**data, owner_id=owner_id)
    db.add(kb)
    try:
        await db.flush()
        create_kb_collection(str(kb.id))
        await db.commit()
        await db.refresh(kb)
        return kb
    except Exception:
        await db.rollback()
        if kb.id:
            try:
                drop_kb_collection(str(kb.id))
            except Exception:
                pass
        raise


async def get_kb_or_404(
    kb_id: uuid.UUID, user: User, db: AsyncSession
) -> KnowledgeBase:
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id, KnowledgeBase.is_active == True
        )
    )
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    if user.role != "admin" and kb.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return kb


async def update_kb(
    kb: KnowledgeBase, data: dict, db: AsyncSession
) -> KnowledgeBase:
    for k, v in data.items():
        if v is not None:
            setattr(kb, k, v)
    await db.commit()
    await db.refresh(kb)
    return kb


async def delete_kb(kb: KnowledgeBase, db: AsyncSession) -> None:
    drop_kb_collection(str(kb.id))
    kb.is_active = False
    await db.commit()
