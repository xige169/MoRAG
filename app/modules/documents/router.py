import uuid
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.modules.auth.service import get_current_user, require_admin
from app.models.user import User
from app.models.document import Document
from app.modules.documents import service
from app.modules.documents.schemas import (
    DocumentOut, DocumentPatch, ChunksResponse, ChunkOut
)
from app.modules.documents.processor import process_document

router = APIRouter(tags=["documents"])


@router.post(
    "/knowledge-bases/{kb_id}/documents",
    response_model=list[DocumentOut],
    status_code=201,
)
async def upload_documents(
    kb_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    docs = await service.upload_documents(kb_id, files, current_user, db)
    for doc in docs:
        background_tasks.add_task(process_document, doc.id)
    return docs


@router.get("/knowledge-bases/{kb_id}/documents", response_model=list[DocumentOut])
async def list_documents(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_documents(kb_id, current_user, db)


@router.get(
    "/knowledge-bases/{kb_id}/documents/{doc_id}", response_model=DocumentOut
)
async def get_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_doc_or_404(doc_id, kb_id, current_user, db)


@router.patch(
    "/knowledge-bases/{kb_id}/documents/{doc_id}", response_model=DocumentOut
)
async def patch_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    body: DocumentPatch,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await service.get_doc_or_404(doc_id, kb_id, current_user, db)
    return await service.patch_document(doc, body.model_dump(exclude_none=True), db)


@router.delete("/knowledge-bases/{kb_id}/documents/{doc_id}", status_code=204)
async def delete_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await service.get_doc_or_404(doc_id, kb_id, current_user, db)
    await service.delete_document(doc, db)


@router.get(
    "/knowledge-bases/{kb_id}/documents/{doc_id}/chunks",
    response_model=ChunksResponse,
)
async def get_chunks(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks = await service.get_chunks(doc_id, db)
    return ChunksResponse(
        doc_id=doc_id,
        doc_name=doc.original_name,
        chunk_count=len(chunks),
        chunks=[
            ChunkOut(
                chunk_index=c.chunk_index,
                page_number=c.page_number,
                content=c.content,
                char_count=c.char_count,
            )
            for c in chunks
        ],
    )


@router.post(
    "/knowledge-bases/{kb_id}/documents/{doc_id}/reprocess",
    status_code=202,
)
async def reprocess_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id, Document.knowledge_base_id == kb_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    background_tasks.add_task(process_document, doc.id)
    return {"message": "Reprocessing started"}
