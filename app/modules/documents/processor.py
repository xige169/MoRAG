import uuid
import asyncio
import traceback
from concurrent.futures import ProcessPoolExecutor
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from langchain_text_splitters import RecursiveCharacterTextSplitter
import dashscope
from dashscope import TextEmbedding

from app.models.document import Document, DocumentChunk
from app.core.milvus_client import get_collection
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal

settings = get_settings()
dashscope.api_key = settings.dashscope_api_key

_executor = ProcessPoolExecutor(max_workers=2)
_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
EMBEDDING_BATCH_SIZE = 10


def _parse_sync(file_path: str, file_type: str) -> list[dict]:
    from app.modules.documents.parsers import parse_file
    return parse_file(file_path, file_type)


async def _embed_batch(texts: list[str]) -> list[list[float]]:
    resp = TextEmbedding.call(
        model=settings.embed_model,
        input=texts,
        dimension=settings.embed_dim,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Embedding API error: {resp.message}")
    return [item["embedding"] for item in resp.output["embeddings"]]


def _chunk_embedding_batches(chunks: list[dict]) -> list[list[dict]]:
    return [
        chunks[i : i + EMBEDDING_BATCH_SIZE]
        for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE)
    ]


async def _delete_vectors(kb_id: uuid.UUID, doc_id: uuid.UUID) -> None:
    collection = get_collection(str(kb_id))
    collection.delete(expr=f'document_id == "{str(doc_id)}"')
    collection.flush()


async def process_document(doc_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        await _process_document(doc_id, db)


async def _process_document(doc_id: uuid.UUID, db: AsyncSession) -> None:
    await db.execute(
        update(Document)
        .where(Document.id == doc_id)
        .values(status="processing", error_message=None)
    )
    await db.commit()
    inserted_doc = None
    inserted_vector_ids: list[str] = []

    try:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one()
        inserted_doc = doc

        loop = asyncio.get_event_loop()
        raw_blocks = await loop.run_in_executor(
            _executor, _parse_sync, doc.stored_path, doc.file_type
        )

        if not raw_blocks:
            raise ValueError("No text extracted from document")

        # Chunk each block, preserving page_number
        all_chunks = []
        for block in raw_blocks:
            texts = _splitter.split_text(block["content"])
            for t in texts:
                all_chunks.append({
                    "content": t,
                    "page_number": block.get("page_number"),
                })

        if not all_chunks:
            raise ValueError("No chunks after splitting")

        # DashScope text-embedding-v4 currently accepts at most 10 inputs per call.
        all_embeddings = []
        for chunk_batch in _chunk_embedding_batches(all_chunks):
            batch = [c["content"] for c in chunk_batch]
            embeddings = await _embed_batch(batch)
            all_embeddings.extend(embeddings)

        # Build Milvus & PG data
        collection = get_collection(str(doc.knowledge_base_id))
        try:
            await _delete_vectors(doc.knowledge_base_id, doc.id)
        except Exception:
            # Reprocessing should not fail just because the previous vector set is absent.
            pass
        await db.execute(
            update(Document).where(Document.id == doc_id).values(chunk_count=0)
        )
        await db.execute(
            DocumentChunk.__table__.delete().where(DocumentChunk.document_id == doc_id)
        )

        milvus_rows = {
            "id": [],
            "chunk_pg_id": [],
            "document_id": [],
            "content": [],
            "is_enabled": [],
            "embedding": [],
        }
        pg_chunks = []

        for i, (chunk, embedding) in enumerate(zip(all_chunks, all_embeddings)):
            chunk_pg_id = uuid.uuid4()
            milvus_id = chunk_pg_id.hex  # 32-char hex string as Milvus ID

            milvus_rows["id"].append(milvus_id)
            inserted_vector_ids.append(milvus_id)
            milvus_rows["chunk_pg_id"].append(str(chunk_pg_id))
            milvus_rows["document_id"].append(str(doc.id))
            milvus_rows["content"].append(chunk["content"][:4000])
            milvus_rows["is_enabled"].append(True)
            milvus_rows["embedding"].append(embedding)

            pg_chunks.append(
                DocumentChunk(
                    id=chunk_pg_id,
                    document_id=doc.id,
                    knowledge_base_id=doc.knowledge_base_id,
                    chunk_index=i,
                    content=chunk["content"],
                    page_number=chunk.get("page_number"),
                    char_count=len(chunk["content"]),
                    milvus_id=milvus_id,
                )
            )

        collection.insert([
            milvus_rows["id"],
            milvus_rows["chunk_pg_id"],
            milvus_rows["document_id"],
            milvus_rows["content"],
            milvus_rows["is_enabled"],
            milvus_rows["embedding"],
        ])
        collection.flush()

        db.add_all(pg_chunks)
        await db.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(status="ready", chunk_count=len(pg_chunks))
        )
        await db.commit()

    except Exception:
        await db.rollback()
        if inserted_doc and inserted_vector_ids:
            try:
                expr = "id in [" + ",".join(f'"{vid}"' for vid in inserted_vector_ids) + "]"
                collection = get_collection(str(inserted_doc.knowledge_base_id))
                collection.delete(expr=expr)
                collection.flush()
            except Exception:
                pass
        error_msg = traceback.format_exc()[:2000]
        await db.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(status="failed", error_message=error_msg)
        )
        await db.commit()
