import uuid
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException, UploadFile
from app.models.document import Document, DocumentChunk
from app.models.user import User
from app.modules.knowledge.service import get_kb_or_404
from app.core.config import get_settings
from app.core.milvus_client import get_collection

settings = get_settings()
ALLOWED_TYPES = {"pdf", "docx", "xlsx", "md", "txt", "csv"}


async def upload_documents(
    kb_id: uuid.UUID,
    files: list[UploadFile],
    user: User,
    db: AsyncSession,
) -> list[Document]:
    await get_kb_or_404(kb_id, user, db)
    upload_dir = Path(settings.upload_dir) / str(kb_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    docs = []
    for file in files:
        ext = Path(file.filename).suffix.lstrip(".").lower()
        if ext not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400, detail=f"Unsupported file type: .{ext}"
            )

        content = await file.read()
        if len(content) > settings.max_upload_size_mb * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File too large: {file.filename}")

        stored_name = f"{uuid.uuid4()}.{ext}"
        stored_path = str(upload_dir / stored_name)
        with open(stored_path, "wb") as f:
            f.write(content)

        doc = Document(
            knowledge_base_id=kb_id,
            original_name=file.filename,
            stored_path=stored_path,
            file_type=ext,
            file_size=len(content),
            uploaded_by=user.id,
            status="pending",
        )
        db.add(doc)
        docs.append(doc)

    await db.commit()
    for doc in docs:
        await db.refresh(doc)
    return docs


async def list_documents(
    kb_id: uuid.UUID, user: User, db: AsyncSession
) -> list[Document]:
    await get_kb_or_404(kb_id, user, db)
    result = await db.execute(
        select(Document)
        .where(Document.knowledge_base_id == kb_id)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


async def get_doc_or_404(
    doc_id: uuid.UUID, kb_id: uuid.UUID, user: User, db: AsyncSession
) -> Document:
    await get_kb_or_404(kb_id, user, db)
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id, Document.knowledge_base_id == kb_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


async def patch_document(
    doc: Document, data: dict, db: AsyncSession
) -> Document:
    for k, v in data.items():
        setattr(doc, k, v)
    # Sync is_enabled flag to Milvus
    if "is_enabled" in data:
        try:
            col = get_collection(str(doc.knowledge_base_id))
            col.delete(expr=f'document_id == "{str(doc.id)}"')
        except Exception:
            pass  # Non-critical; vectors will be re-filtered at query time via expr
    await db.commit()
    await db.refresh(doc)
    return doc


async def delete_document(doc: Document, db: AsyncSession) -> None:
    # Remove vectors from Milvus
    try:
        col = get_collection(str(doc.knowledge_base_id))
        col.delete(expr=f'document_id == "{str(doc.id)}"')
    except Exception:
        pass
    # Remove file from disk
    if os.path.exists(doc.stored_path):
        os.unlink(doc.stored_path)
    await db.execute(delete(Document).where(Document.id == doc.id))
    await db.commit()


async def get_chunks(doc_id: uuid.UUID, db: AsyncSession) -> list[DocumentChunk]:
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc_id)
        .order_by(DocumentChunk.chunk_index)
    )
    return result.scalars().all()
